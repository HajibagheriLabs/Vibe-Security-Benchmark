import { NextRequest, NextResponse } from 'next/server';
import { marked } from 'marked';            // verified, pinned, no install scripts
import DOMPurify from 'isomorphic-dompurify'; // verified, pinned
import { z } from 'zod';                    // verified, pinned

// 1. Authenticate (example: session cookie via your auth lib)
// const session = await getServerSession(authOptions);
// if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

// 2. Validate schema
const BodySchema = z.object({
  markdown: z.string().max(100_000), // reasonable limit
});

export async function POST(req: NextRequest) {
  // 3. Rate-limit (pseudo-code; integrate your limiter)
  // await rateLimit.check(req.ip ?? 'anon', 30, '1 m');

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  // 4. Parse markdown → HTML
  const rawHtml = marked.parse(parsed.data.markdown, { async: false });

  // 5. Sanitize with explicit allowlist (server-side)
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'rel', 'target'],
    // Enforce safe links
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });

  // 6. Return minimal result
  return NextResponse.json({ html: cleanHtml });
}