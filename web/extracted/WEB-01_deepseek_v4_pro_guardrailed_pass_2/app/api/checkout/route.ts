import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Narrowest scope: secret key only, never publishable key server-side for session creation.
// Required scope: stripe secret key (sk_live_.../sk_test_...) with checkout.sessions.create permission.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const checkoutSchema = z.object({
  priceId: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(100),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// Simple in-memory rate limiter (per-user). Replace with Redis/Upstash in multi-instance deploys.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function sanitizeForLog(value: string): string {
  return value.replace(/[\r\n\u2028\u2029]/g, "").replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Rate-limit
  if (isRateLimited(userId)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validate schema
  let body: z.infer<typeof checkoutSchema>;
  try {
    body = checkoutSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // 4. Validate redirect URLs against allowlist
  const allowedHosts = new Set([
    process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL).host : "",
  ]);
  const successHost = new URL(body.successUrl).host;
  const cancelHost = new URL(body.cancelUrl).host;
  if (!allowedHosts.has(successHost) || !allowedHosts.has(cancelHost)) {
    return NextResponse.json({ error: "Invalid redirect URL" }, { status: 400 });
  }

  // 5. Call Stripe
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: body.priceId,
          quantity: body.quantity,
        },
      ],
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
      },
    });

    // 6. Return minimal result
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    // Log structured, sanitized error — never raw vendor payload
    console.error({
      event: "stripe_checkout_session_create_failed",
      userId,
      priceId: sanitizeForLog(body.priceId),
      errorMessage: error instanceof Error ? sanitizeForLog(error.message) : "unknown_error",
    });
    return NextResponse.json({ error: "Payment initiation failed" }, { status: 502 });
  }
}