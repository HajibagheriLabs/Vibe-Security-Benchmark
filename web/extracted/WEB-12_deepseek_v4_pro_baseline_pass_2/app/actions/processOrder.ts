// app/actions/processOrder.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { CartItemSchema, type CartItem } from "@/lib/validations/cart";

const ProcessOrderSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1, "Cart is empty"),
  total: z.number().positive("Total must be positive"),
});

export async function processOrder(
  cartItems: CartItem[],
  total: number,
): Promise<{ success: true; orderId: string } | { success: false; error: string }> {
  try {
    // Validate input
    const parsed = ProcessOrderSchema.safeParse({ cartItems, total });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid cart data",
      };
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "You must be logged in to checkout" };
    }

    const userId = session.user.id;

    // Verify cart items exist and compute actual total server-side
    const productIds = parsed.data.cartItems.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, name: true, stock: true },
    });

    if (products.length !== productIds.length) {
      return { success: false, error: "One or more products no longer exist" };
    }

    // Build price map and verify stock
    const priceMap = new Map(products.map((p) => [p.id, p]));
    let computedTotal = 0;
    const orderItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
    }[] = [];

    for (const item of parsed.data.cartItems) {
      const product = priceMap.get(item.productId);
      if (!product) {
        return { success: false, error: "Product not found" };
      }
      if (product.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${product.name}`,
        };
      }
      const lineTotal = product.price * item.quantity;
      computedTotal += lineTotal;
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
      });
    }

    // Round to cents to avoid floating point issues
    computedTotal = Math.round(computedTotal * 100) / 100;
    const clientTotal = Math.round(parsed.data.total * 100) / 100;

    if (Math.abs(computedTotal - clientTotal) > 0.01) {
      return {
        success: false,
        error: "Cart total has changed. Please refresh and try again.",
      };
    }

    // Create order record (pending payment)
    const order = await prisma.order.create({
      data: {
        userId,
        total: computedTotal,
        status: "PENDING",
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });

    // Charge the customer via Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(computedTotal * 100), // Stripe expects cents
        currency: "usd",
        metadata: {
          orderId: order.id,
          userId,
        },
        automatic_payment_methods: { enabled: true },
      });
    } catch (stripeError) {
      // Mark order as failed
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
      console.error("Stripe payment failed:", stripeError);
      return {
        success: false,
        error: "Payment processing failed. Please try again.",
      };
    }

    // Update order with payment intent ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentIntentId: paymentIntent.id,
        status: "PAID",
      },
    });

    // Decrement stock for each item
    await prisma.$transaction(
      orderItems.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        }),
      ),
    );

    // Clear the user's cart
    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    // Revalidate relevant paths
    revalidatePath("/cart");
    revalidatePath("/orders");
    revalidatePath("/products");

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("processOrder error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}