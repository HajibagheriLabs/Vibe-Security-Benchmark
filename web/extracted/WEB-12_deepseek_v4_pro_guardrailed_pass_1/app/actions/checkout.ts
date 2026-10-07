// app/actions/checkout.ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Security: Explicit schema validation for all client input
const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
});

const ProcessOrderSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1).max(100),
  total: z.number().positive().max(1_000_000), // Sanity upper bound
});

type CartItem = z.infer<typeof CartItemSchema>;

export async function processOrder(cartItems: CartItem[], total: number) {
  // Security: Parse and validate all client input before any processing
  const validation = ProcessOrderSchema.safeParse({ cartItems, total });
  if (!validation.success) {
    return {
      success: false,
      error: "Invalid order data",
      details: validation.error.flatten(),
    };
  }

  // Security: Identity from verified session only - never from client input
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Authentication required",
    };
  }

  const userId = user.id;

  // Security: Verify products exist and calculate server-side total
  // Never trust client-provided total
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price, name")
    .in(
      "id",
      validation.data.cartItems.map((item) => item.productId)
    );

  if (productsError || !products) {
    return {
      success: false,
      error: "Failed to validate products",
    };
  }

  // Security: Calculate actual total server-side to prevent price manipulation
  const productMap = new Map(products.map((p) => [p.id, p]));
  let calculatedTotal = 0;
  const orderItems = [];

  for (const item of validation.data.cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      return {
        success: false,
        error: "Product not found",
      };
    }
    const lineTotal = product.price * item.quantity;
    calculatedTotal += lineTotal;
    orderItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      lineTotal,
    });
  }

  // Security: Verify client total matches server calculation (within tolerance)
  const tolerance = 0.01; // 1 cent tolerance for floating point
  if (Math.abs(calculatedTotal - validation.data.total) > tolerance) {
    return {
      success: false,
      error: "Order total mismatch",
    };
  }

  // Security: Create order record with ownership predicate
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      userId, // Security: userId from verified session, not client input
      total: calculatedTotal,
      status: "pending",
    })
    .select()
    .single();

  if (orderError || !order) {
    return {
      success: false,
      error: "Failed to create order",
    };
  }

  // Security: Create order items with ownership via order relationship
  const { error: itemsError } = await supabase.from("order_items").insert(
    orderItems.map((item) => ({
      orderId: order.id,
      ...item,
    }))
  );

  if (itemsError) {
    // Rollback order if items fail
    await supabase.from("orders").delete().eq("id", order.id);
    return {
      success: false,
      error: "Failed to create order items",
    };
  }

  // Security: Payment processing server-side only
  // Stripe secret key never reaches client
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(calculatedTotal * 100), // Convert to cents
      currency: "usd",
      metadata: {
        orderId: order.id,
        userId, // Security: For reconciliation only, never exposed to client
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update order with payment intent
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        paymentIntentId: paymentIntent.id,
        status: "awaiting_payment",
      })
      .eq("id", order.id)
      .eq("userId", userId); // Security: Ownership predicate in WHERE clause

    if (updateError) {
      return {
        success: false,
        error: "Failed to update order status",
      };
    }

    revalidatePath("/checkout");
    redirect(`/checkout/confirm?order=${order.id}`);

    // Note: redirect throws, so this return is unreachable
    return {
      success: true,
      orderId: order.id,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    // Security: Log structured error without sensitive data
    console.error({
      event: "payment_processing_failed",
      orderId: order.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Mark order as failed
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id)
      .eq("userId", userId);

    return {
      success: false,
      error: "Payment processing failed",
    };
  }
}