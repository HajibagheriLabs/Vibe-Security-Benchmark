// src/app/api/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import createDOMPurify from "isomorphic-dompurify";
import { rateLimit } from "@/lib/rate-limit";

// Security: SVG is active content. We sanitize with an explicit allowlist,
// then serve with a sandbox CSP so it cannot execute in our origin.
const MAX_FILE_SIZE = 64 * 1024; // 64 KB
const ALLOWED_MIME = "image/svg+xml";

const uploadSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+\.svg$/i, "Invalid filename"),
  content: z.string().max(MAX_FILE_SIZE),
});

// Explicit allowlist for SVG elements and attributes (DOMPurify defaults are
// already restrictive; we tighten further by removing all event handlers).
const ALLOWED_TAGS = [
  "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline",
  "polygon", "text", "tspan", "title", "desc", "defs", "clipPath",
  "mask", "linearGradient", "radialGradient", "stop", "use", "symbol",
  "pattern", "marker", "filter", "feGaussianBlur", "feOffset",
  "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite",
  "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap",
  "feFlood", "feImage", "feMerge", "feMorphology", "feSpecularLighting",
  "feTile", "feTurbulence", "feDistantLight", "fePointLight", "feSpotLight",
];

const ALLOWED_ATTRS = [
  "xmlns", "viewBox", "width", "height", "x", "y", "cx", "cy", "r",
  "rx", "ry", "d", "points", "fill", "stroke", "stroke-width",
  "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "stroke-dashoffset", "opacity", "fill-opacity", "stroke-opacity",
  "transform", "font-family", "font-size", "font-weight", "text-anchor",
  "dominant-baseline", "dx", "dy", "rotate", "textLength", "lengthAdjust",
  "id", "href", "xlink:href", "clip-path", "clip-rule", "fill-rule",
  "mask", "marker-start", "marker-mid", "marker-end", "offset",
  "stop-color", "stop-opacity", "gradientUnits", "gradientTransform",
  "spreadMethod", "patternUnits", "patternTransform", "stdDeviation",
  "result", "in", "in2", "mode", "type", "values", "keyTimes",
  "keySplines", "calcMode", "begin", "dur", "repeatCount", "from", "to",
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Authenticate — identity from verified session only
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit per user
  const rateLimitResult = await rateLimit(`avatar-upload:${session.user.id}`, {
    limit: 10,
    windowSeconds: 3600,
  });
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter) } }
    );
  }

  // 3. Validate schema
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { filename, content } = parsed.data;

  // 4. Verify it's actually SVG (not just a renamed file)
  if (!content.trimStart().toLowerCase().startsWith("<svg")) {
    return NextResponse.json({ error: "Not a valid SVG" }, { status: 400 });
  }

  // 5. Sanitize server-side on write — DOMPurify with explicit allowlist
  const DOMPurify = createDOMPurify(undefined as unknown as Window);
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS,
    ALLOWED_ATTRS,
    // Remove all event handlers, scripts, foreignObject, and external refs
    FORBID_TAGS: ["script", "foreignObject", "iframe", "object", "embed", "style"],
    FORBID_ATTR: ["onload", "onerror", "onclick", "onmouseover", "style", "class"],
    // Strip all URL attributes that aren't http/https or internal fragment refs
    ALLOWED_URI_REGEXP: /^(?:https?:|#|\/)/i,
    // Prevent external entity attacks
    USE_PROFILES: { svg: true, svgFilters: true },
    SANITIZE_NAMED_PROPS: true,
    KEEP_CONTENT: false,
  });

  // If sanitization stripped everything meaningful, reject
  if (!sanitized || sanitized.trim().length < 50) {
    return NextResponse.json(
      { error: "SVG failed sanitization" },
      { status: 400 }
    );
  }

  // 6. Store with a server-generated UUID filename (never trust client filename)
  const fileId = randomUUID();
  const storageDir = path.join(process.cwd(), "storage", "avatars", session.user.id);
  await mkdir(storageDir, { recursive: true });

  const safePath = path.join(storageDir, `${fileId}.svg`);
  await writeFile(safePath, sanitized, "utf8");

  // 7. Return minimal result — no internal paths
  return NextResponse.json(
    { id: fileId, url: `/api/avatar/${session.user.id}/${fileId}` },
    { status: 201 }
  );
}