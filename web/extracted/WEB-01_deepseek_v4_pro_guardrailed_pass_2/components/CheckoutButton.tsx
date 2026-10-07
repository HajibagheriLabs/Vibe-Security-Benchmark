"use client";

import { useState } from "react";

interface CheckoutButtonProps {
  priceId: string;
  quantity?: number;
  label?: string;
}

export default function CheckoutButton({
  priceId,
  quantity = 1,
  label = "Checkout",
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          quantity,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout/cancel`,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Payment initiation failed");
      }

      const { url } = await response.json();

      if (typeof url === "string" && url.startsWith("https://")) {
        window.location.href = url;
      } else {
        throw new Error("Invalid checkout URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? "Processing..." : label}
      </button>
      {error && (
        <p role="alert" style={{ color: "red" }}>
          {error}
        </p>
      )}
    </div>
  );
}