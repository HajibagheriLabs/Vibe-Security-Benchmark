"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Security: Stripe secret key lives server-side only (lib/stripe.ts), never in client bundle.
// Required Stripe scope: write access to PaymentIntents and Customers.

const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

const ProcessOrderSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1).max(50),
  total: z.number().int().min(1), // cents, validated against server-side price calculation
});

type ProcessOrderInput = z.infer<typeof ProcessOrderSchema>;

interface ProcessOrderResult {
  success: boolean;
  orderId?: string;
  clientSecret?: string;
  error?: string;
}

function sanitizeForLog(value: unknown): string {
  return String(value)
    .replace(/[\r\n\u2028\u2029]/g, "")
    .replace(/\u001b\[[0-9;]*m/g, "");
}

export async function processOrder(
  cartItems: ProcessOrderInput["cartItems"],
  total: ProcessOrderInput["total"]
): Promise<ProcessOrderResult> {
  // 1. Authenticate — identity from verified session only
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required." };
  }
  const userId = session.user.id;

  // 2. Validate schema
  const parsed = ProcessOrderSchema.safeParse({ cartItems, total });
  if (!parsed.success) {
    logger.warn({
      event: "checkout_validation_failed",
      userId,
      errors: sanitizeForLog(parsed.error.message),
    });
    return { success: false, error: "Invalid order data." };
  }

  // 3. Rate limit
  const rateLimitKey = `checkout:${userId}`;
  const allowed = await rateLimit(rateLimitKey, { limit: 10, windowSec: 60 });
  if (!allowed) {
    logger.warn({ event: "checkout_rate_limited", userId });
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  // 4. Server-side price verification — never trust client total
  const productIds = parsed.data.cartItems.map((item) => item.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, active: true },
    select: { id: true, priceCents: true },
  });

  if (products.length !== productIds.length) {
    logger.warn({ event: "checkout_invalid_products", userId });
    return { success: false, error: "One or more products are unavailable." };
  }

  const productMap = new Map(products.map((p) => [p.id, p.priceCents]));
  const serverTotal = parsed.data.cartItems.reduce(
    (sum, item) => sum + (productMap.get(item.productId) ?? 0) * item.quantity,
    0
  );

  if (serverTotal !== parsed.data.total) {
    logger.warn({
      event: "checkout_price_mismatch",
      userId,
      clientTotal: parsed.data.total,
      serverTotal,
    });
    return { success: false, error: "Order total mismatch. Please refresh and try again." };
  }

  // 5. Create order record (ownership bound to session user)
  const order = await db.order.create({
    data: {
      userId,
      totalCents: serverTotal,
      status: "pending",
      items: {
        create: parsed.data.cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceCents: productMap.get(item.productId) ?? 0,
        })),
      },
    },
  });

  // 6. Charge via Stripe (server-side proxy to payment vendor)
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: serverTotal,
      currency: "usd",
      metadata: {
        orderId: order.id,
        userId,
      },
      automatic_payment_methods: { enabled: true },
    });

    await db.order.update({
      where: { id: order.id, userId }, // ownership predicate in WHERE
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    logger.info({
      event: "checkout_payment_intent_created",
      userId,
      orderId: order.id,
      amountCents: serverTotal,
    });

    return {
      success: true,
      orderId: order.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
    };
  } catch (error) {
    logger.error({
      event: "checkout_payment_failed",
      userId,
      orderId: order.id,
      error: sanitizeForLog(error instanceof Error ? error.message : "Unknown error"),
    });

    await db.order.update({
      where: { id: order.id, userId },
      data: { status: "failed" },
    });

    return { success: false, error: "Payment processing failed. Please try again." };
  }
}