// app/components/checkout-button.tsx
"use client";

import { useState } from "react";

type CheckoutButtonProps = {
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
};

export function CheckoutButton({
  priceId,
  quantity = 1,
  successUrl,
  cancelUrl,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, quantity, successUrl, cancelUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Checkout failed");
      }

      const { url } = await res.json();

      // Redirect destinations come from an allowlist map on the server.
      // The returned URL is the Stripe-hosted Checkout URL, not user input.
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Redirecting..." : "Checkout"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}