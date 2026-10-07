"use client";

import { useState } from "react";

interface PaymentButtonProps {
  priceId: string;
  mode?: "payment" | "subscription";
  children: React.ReactNode;
  className?: string;
}

export function PaymentButton({
  priceId,
  mode = "payment",
  children,
  className = "",
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        const stripe = (window as any).Stripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        );
        if (!stripe) throw new Error("Stripe failed to load");
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (stripeError) throw stripeError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      aria-busy={loading}
    >
      {loading ? "Redirecting…" : children}
      {error && <span role="alert" className="sr-only">{error}</span>}
    </button>
  );
}