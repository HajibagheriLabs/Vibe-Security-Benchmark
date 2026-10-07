'use client';

import { useState } from 'react';
import { getStripe } from '@/lib/stripe';

interface PaymentInitiationProps {
  priceId: string;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  buttonLabel?: string;
  className?: string;
}

export default function PaymentInitiation({
  priceId,
  quantity = 1,
  successUrl,
  cancelUrl,
  buttonLabel = 'Pay Now',
  className = '',
}: PaymentInitiationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          quantity,
          successUrl,
          cancelUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const stripe = await getStripe();

      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectError) {
        throw new Error(redirectError.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`payment-initiation ${className}`}>
      <button
        onClick={handleCheckout}
        disabled={isLoading}
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Processing...' : buttonLabel}
      </button>

      {error && (
        <div
          role="alert"
          className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          {error}
        </div>
      )}
    </div>
  );
}