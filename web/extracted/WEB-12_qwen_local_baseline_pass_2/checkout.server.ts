// checkout.server.ts
import { db } from './db';
import { stripe } from './payment-gateway';
import { z } from 'zod';

const OrderSchema = z.object({
  cartItems: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().int().positive(),
      price: z.number(),
    })
  ),
  total: z.number().positive(),
});

export async function processOrder(cartItems: z.infer<typeof OrderSchema>['cartItems'], total: number) {
  // Validate input
  OrderSchema.parse({ cartItems, total });

  try {
    // 1. Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: cartItems.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Item ${item.id}`, // Ideally fetched from product DB
          },
          unit_amount: Math.round(item.price * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cart`,
      metadata: {
        cartItems: JSON.stringify(cartItems),
        total: total.toString(),
      },
    });

    // 2. Store pending order in database
    const order = await db.order.create({
      data: {
        status: 'pending',
        stripeSessionId: session.id,
        totalAmount: total,
        items: {
          create: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            priceAtPurchase: item.price,
          })),
        },
      },
    });

    // 3. Return session URL to redirect user
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Failed to process order:', error);
    throw new Error('Could not process order');
  }
}