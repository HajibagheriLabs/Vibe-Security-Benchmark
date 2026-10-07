import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
  typescript: true,
});

export interface CreateCheckoutParams {
  userId: string;
  priceId: string;
  mode: "payment" | "subscription";
}

export async function createCheckoutSession({
  userId,
  priceId,
  mode,
}: CreateCheckoutParams) {
  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
    client_reference_id: userId,
    metadata: { userId },
    allow_promotion_codes: true,
  });

  return { sessionId: session.id, url: session.url };
}

export async function getSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "customer", "subscription"],
  });
}

export { stripe };