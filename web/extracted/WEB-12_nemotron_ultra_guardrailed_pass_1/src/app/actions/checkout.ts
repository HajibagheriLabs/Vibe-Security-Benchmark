'use server';

import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { z } from 'zod';

const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  priceCents: z.number().int().positive(),
});

const ProcessOrderInputSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1),
  totalCents: z.number().int().positive(),
});

export async function processOrder(
  cartItems: z.infer<typeof CartItemSchema>[],
  totalCents: number
): Promise<{ clientSecret: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const parsed = ProcessOrderInputSchema.safeParse({ cartItems, totalCents });
  if (!parsed.success) {
    return { error: 'Invalid input' };
  }

  const { cartItems: validatedItems, totalCents: validatedTotal } = parsed.data;

  const calculatedTotal = validatedItems.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );
  if (calculatedTotal !== validatedTotal) {
    return { error: 'Total mismatch' };
  }

  const productIds = validatedItems.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, priceCents: true, name: true },
  });

  const priceMap = new Map(products.map((p) => [p.id, p.priceCents]));
  for (const item of validatedItems) {
    if (priceMap.get(item.productId) !== item.priceCents) {
      return { error: 'Price mismatch' };
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: validatedTotal,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
      userId: session.user.id,
      items: JSON.stringify(validatedItems.map((i) => ({ productId: i.productId, quantity: i.quantity }))),
    },
  });

  await db.order.create({
    data: {
      userId: session.user.id,
      totalCents: validatedTotal,
      status: 'PENDING',
      items: {
        create: validatedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceCents: item.priceCents,
        })),
      },
    },
  });

  return { clientSecret: paymentIntent.client_secret! };
}