import Stripe from "stripe";

// Security: STRIPE_SECRET_KEY is server-only. Never prefixed with NEXT_PUBLIC_ or VITE_.
// Required scope: write access to PaymentIntents, Customers.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not configured.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
});