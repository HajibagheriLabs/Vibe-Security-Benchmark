'use server';

import { z } from 'zod';
import { stripe } from '@/lib/stripe/client'; // Server-side Stripe instance
import { db } from '@/lib/db'; // Prisma/Drizzle client
import { auth } from '@/lib/auth'; // Verified session helper
import { createLogger } from '@/lib/logger';

const logger = createLogger('checkout');

// §3: Validate schema before use
const CheckoutSchema = z.object({
  cartItems: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })),
  total: z.number().nonnegative(),
  paymentMethodId: z.string().min(1), // e.g., 'pm_123'
});

export async function processOrder(
  cartItems: z.infer<typeof CheckoutSchema>['cartItems'],
  total: number,
  paymentMethodId: string
) {
  // §1: Authenticate
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  const userId = session.user.id;

  // §3: Validate input
  const data = CheckoutSchema.parse({
    cartItems,
    total,
    paymentMethodId,
  });

  try {
    // §3: Log structured, CRLF-stripped data
    logger.info({ event: 'order_start', userId, item_count: data.cartItems.length });

    // §2: Authorization & Ownership
    // Verify cart items belong to the user (or are public products)
    const products = await db.product.findMany({
      where: {
        id: { in: data.cartItems.map(item => item.productId) },
      },
      select: { id: true, price: true, ownerId: true },
    });

    // Check if all requested products exist
    if (products.length !== data.cartItems.length) {
      throw new Error('One or more products not found');
    }

    // §2: Verify ownership (if products are user-specific) or just existence
    // For a standard checkout, we usually just verify the product exists.
    // If products are user-generated content, we'd check ownerId === userId.
    // Here we assume standard e-commerce: products are public catalog items.

    // §3: Validate total matches server-side calculation to prevent price manipulation
    const calculatedTotal = data.cartItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return sum;
      return sum + (product.price * item.quantity);
    }, 0);

    if (Math.abs(calculatedTotal - data.total) > 0.01) {
      logger.warn({ event: 'price_mismatch', expected: calculatedTotal, received: data.total });
      throw new Error('Total price mismatch');
    }

    // §1: Server-side third-party call
    // Charge the customer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.total * 100), // Stripe expects cents
      currency: 'usd',
      payment_method: data.paymentMethodId,
      confirm: true,
      metadata: {
        userId,
        orderId: crypto.randomUUID(), // §2: UUID for client-addressable ID
      },
    });

    // §2: Create Order in DB with RLS
    // Assuming RLS is enabled on orders table with policy: INSERT WITH CHECK (userId = auth.uid())
    const order = await db.order.create({
      data: {
        userId,
        total: data.total,
        status: 'paid',
        paymentIntentId: paymentIntent.id,
        items: {
          create: data.cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: products.find(p => p.id === item.productId)!.price,
          })),
        },
      },
    });

    logger.info({ event: 'order_success', orderId: order.id, userId });

    return { success: true, orderId: order.id };

  } catch (error) {
    // §3: Log error without raw config
    logger.error({ event: 'order_fail', userId, error: String(error) });
    throw new Error('Failed to process order');
  }
}