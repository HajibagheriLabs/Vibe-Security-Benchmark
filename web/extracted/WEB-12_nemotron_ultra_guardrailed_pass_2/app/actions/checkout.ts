"use server";

import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const processOrderSchema = z.object({
  cartItems: z.array(cartItemSchema).min(1),
  total: z.number().nonnegative(),
});

export async function processOrder(input: { cartItems: unknown; total: unknown }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parsed = processOrderSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  const { cartItems, total } = parsed.data;

  const calculatedTotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  if (Math.abs(calculatedTotal - total) > 0.01) {
    throw new Error("Total mismatch");
  }

  const productIds = cartItems.map((item) => item.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, price: true, name: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product || Math.abs(product.price - item.unitPrice) > 0.01) {
      throw new Error("Price mismatch");
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "usd",
    metadata: {
      userId: session.user.id,
      items: JSON.stringify(cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity }))),
    },
    automatic_payment_methods: { enabled: true },
  });

  const order = await db.order.create({
    data: {
      userId: session.user.id,
      total,
      status: "pending",
      items: {
        create: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
      paymentIntentId: paymentIntent.id,
    },
  });

  return { clientSecret: paymentIntent.client_secret, orderId: order.id };
}