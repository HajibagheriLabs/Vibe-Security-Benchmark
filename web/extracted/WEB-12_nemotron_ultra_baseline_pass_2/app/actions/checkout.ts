"use server";

import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { z } from "zod";

const CartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  name: z.string(),
  image: z.string().url().nullable(),
});

const ProcessOrderInputSchema = z.object({
  cartItems: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  total: z.number().nonnegative(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type ProcessOrderInput = z.infer<typeof ProcessOrderInputSchema>;

export async function processOrder(input: ProcessOrderInput) {
  const parsed = ProcessOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input", issues: parsed.error.flatten().fieldErrors };
  }

  const { cartItems, total, successUrl, cancelUrl } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Authentication required" };
  }

  // Verify stock and calculate server-side total to prevent price tampering
  const productIds = cartItems.map((item) => item.productId);
  const variantIds = cartItems
    .map((item) => item.variantId)
    .filter((id): id is string => id !== null);

  const [{ data: products, error: productsError }, { data: variants, error: variantsError }] = await Promise.all([
    supabase.from("products").select("id, price, stock, stripe_price_id").in("id", productIds),
    variantIds.length > 0
      ? supabase.from("product_variants").select("id, price, stock, stripe_price_id").in("id", variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsError || variantsError) {
    console.error("Inventory fetch error:", productsError || variantsError);
    return { error: "Failed to verify inventory" };
  }

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));
  const variantMap = new Map((variants ?? []).map((v) => [v.id, v]));

  let calculatedTotal = 0;
  const lineItems: Array<{ price: string; quantity: number }> = [];

  for (const item of cartItems) {
    const variant = item.variantId ? variantMap.get(item.variantId) : null;
    const product = productMap.get(item.productId);

    const source = variant ?? product;
    if (!source) {
      return { error: `Product ${item.productId} not found` };
    }

    if (source.stock < item.quantity) {
      return { error: `Insufficient stock for ${item.name}. Available: ${source.stock}` };
    }

    if (!source.stripe_price_id) {
      return { error: `Price not configured for ${item.name}` };
    }

    calculatedTotal += source.price * item.quantity;
    lineItems.push({ price: source.stripe_price_id, quantity: item.quantity });
  }

  // Allow small floating point differences
  if (Math.abs(calculatedTotal - total) > 0.01) {
    return { error: "Price mismatch. Please refresh your cart." };
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: user.id,
      cart_items: JSON.stringify(cartItems.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))),
    },
    shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU"] },
    billing_address_collection: "required",
  });

  if (!session.url) {
    return { error: "Failed to create checkout session" };
  }

  redirect(session.url);
}