"use server";

import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CartItem } from "@/types/cart";

export async function processOrder(cartItems: CartItem[], total: number) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Authentication required to process order");
  }

  if (!cartItems.length) {
    throw new Error("Cart is empty");
  }

  if (total <= 0) {
    throw new Error("Invalid order total");
  }

  const lineItems = cartItems.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
        description: item.description,
        images: item.image ? [item.image] : [],
        metadata: {
          productId: item.id,
          variantId: item.variantId || "",
        },
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
    customer_email: session.user.email,
    metadata: {
      userId: session.user.id,
      itemCount: cartItems.length.toString(),
    },
    shipping_address_collection: {
      allowed_countries: ["US", "CA", "GB", "AU"],
    },
    billing_address_collection: "required",
    phone_number_collection: {
      enabled: true,
    },
    automatic_tax: {
      enabled: true,
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session");
  }

  redirect(checkoutSession.url);
}