// app/actions/processOrder.ts
"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const CartItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
});

const ProcessOrderInputSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1),
  total: z.number().positive(),
});

export type CartItem = z.infer<typeof CartItemSchema>;
export type ProcessOrderResult = {
  success: boolean;
  orderId?: string;
  error?: string;
};

export async function processOrder(
  cartItems: CartItem[],
  total: number
): Promise<ProcessOrderResult> {
  // 1. Validate input
  const parsed = ProcessOrderInputSchema.safeParse({ cartItems, total });
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid cart data provided.",
    };
  }

  // 2. Authenticate the user
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be signed in to complete your purchase.",
    };
  }

  const userId = session.user.id;

  // 3. Recalculate total server-side to prevent tampering
  const calculatedTotal = parsed.data.cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Allow small floating-point tolerance
  const tolerance = 0.01;
  if (Math.abs(calculatedTotal - parsed.data.total) > tolerance) {
    return {
      success: false,
      error: "Cart total mismatch. Please refresh and try again.",
    };
  }

  // 4. Create a payment intent with Stripe
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(calculatedTotal * 100), // convert to cents
      currency: "usd",
      metadata: {
        userId,
        itemCount: parsed.data.cartItems.length,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // 5. Persist the order in the database
    const order = await db.order.create({
      data: {
        userId,
        total: calculatedTotal,
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
        items: {
          create: parsed.data.cartItems.map((item) => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 6. Revalidate any cached cart/order pages
    revalidatePath("/cart");
    revalidatePath("/orders");

    // 7. Return success with the client secret for payment confirmation
    return {
      success: true,
      orderId: order.id,
    };
  } catch (error) {
    console.error("Error processing order:", error);
    return {
      success: false,
      error: "Unable to process your payment. Please try again.",
    };
  }
}