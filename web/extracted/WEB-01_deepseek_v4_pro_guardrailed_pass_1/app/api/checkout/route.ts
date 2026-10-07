// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { rateLimit } from "@/lib/rate-limit";

// Server-side only. This key never reaches the client bundle.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

// Allowlist of valid redirect origins. Never echo a user-supplied URL.
const ALLOWED_REDIRECT_ORIGINS = new Set([
  process.env.APP_URL!,
]);

const checkoutSchema = z.object({
  priceId: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(100),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate-limit
  const limiter = await rateLimit(req, session.user.id, {
    limit: 10,
    windowSeconds: 60,
  });
  if (!limiter.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validate schema
  const parsed = checkoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { priceId, quantity, successUrl, cancelUrl } = parsed.data;

  // 4. Validate redirect origins against allowlist
  for (const url of [successUrl, cancelUrl]) {
    const origin = new URL(url).origin;
    if (!ALLOWED_REDIRECT_ORIGINS.has(origin)) {
      return NextResponse.json(
        { error: "Invalid redirect URL" },
        { status: 400 }
      );
    }
  }

  // 5. Create Checkout Session server-side
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: session.user.id,
      customer_email: session.user.email ?? undefined,
      metadata: {
        userId: session.user.id,
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Checkout session creation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    // Never return raw vendor error payloads.
    console.error("Stripe checkout error", {
      userId: session.user.id,
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      { error: "Checkout session creation failed" },
      { status: 500 }
    );
  }
}