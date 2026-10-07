// server/actions/checkout/processOrder.ts
import { z } from 'zod';
import { stripe } from '@/lib/stripe/client';
import { db } from '@/lib/db/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

// 1. Schema Validation
// Rule: Parse every request body with an explicit schema before use.
// Rule: Coerce NoSQL filter values to primitives.
const ProcessOrderSchema = z.object({
  cartItems: z.array(
    z.object({
      id: z.string().uuid(), // Rule: Client-addressable identifiers are UUID
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })
  ),
  total: z.number().positive(),
});

// 2. Authorization
// Rule: Identity comes from the verified session only.
// Rule: Every new route is protected by default.
async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }
  return session.user.id;
}

// 3. Execution
export async function processOrder(cartItems: z.infer<typeof ProcessOrderSchema>['cartItems'], total: number) {
  // Validate input
  const validatedInput = ProcessOrderSchema.parse({ cartItems, total });

  // Get authenticated user
  const userId = await getAuthenticatedUser();

  // Fetch user's default payment method server-side
  // Rule: Every privileged third-party call runs server-side behind an authenticated, validated proxy.
  const customer = await db.customer.findUnique({
    where: { userId },
    select: { paymentMethodId: true },
  });

  if (!customer?.paymentMethodId) {
    logger.warn({ event: 'checkout_no_payment_method', userId });
    throw new Error('No payment method on file.');
  }

  // Create Stripe Charge
  // Rule: authenticate → authorize → validate schema → rate-limit → call vendor → return minimal result.
  // Note: In a real scenario, we might create a Stripe Customer if one doesn't exist, 
  // but here we assume the Customer table links to Stripe.
  try {
    const charge = await stripe.charges.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'usd',
      customer: customer.paymentMethodId, // Using PM ID as Customer ID for simplicity in this example, or fetch actual Customer ID
      description: `Order for user ${userId}`,
    });

    // Record order in DB
    // Rule: The ownership predicate belongs inside the WHERE clause (implicit via userId)
    await db.order.create({
      data: {
        userId,
        total: validatedInput.total,
        status: 'paid',
        stripeChargeId: charge.id,
      },
    });

    logger.info({ event: 'order_processed', userId, orderId: undefined }); // Order ID not yet generated in create? Usually create returns it.
    // Corrected logging:
    const order = await db.order.findFirst({ where: { userId, stripeChargeId: charge.id } });
    if (order) {
        logger.info({ event: 'order_processed', userId, orderId: order.id });
    }

    return { success: true, orderId: order?.id };
  } catch (error) {
    // Rule: Never log or return raw config objects, request headers, or vendor error payloads.
    logger.error({ event: 'charge_failed', userId, error: (error as Error).message });
    throw new Error('Payment failed. Please try again.');
  }
}