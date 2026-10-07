// components/PaymentInitiation.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// State to hold the Stripe instance
let stripePromise: Promise<Stripe | null>;

const getStripe = async (): Promise<Stripe | null> => {
  if (!stripePromise) {
    // Fetch the publishable key from the server to avoid hardcoding or client-side secret usage
    const res = await fetch('/api/stripe-key');
    if (!res.ok) {
      throw new Error('Failed to fetch Stripe configuration');
    }
    const { publishableKey } = await res.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

interface PaymentInitiationProps {
  priceId: string;
  quantity?: number;
  onSuccessUrl?: string;
  onCancelUrl?: string;
}

export const PaymentInitiation: React.FC<PaymentInitiationProps> = ({
  priceId,
  quantity = 1,
  onSuccessUrl = '/payment/success',
  onCancelUrl = '/payment/cancel',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get Stripe Instance
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // 2. Create Checkout Session on Server
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          quantity,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // 3. Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        throw new Error(stripeError.message || 'Redirect to checkout failed');
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-initiation">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
      {error && (
        <p className="text-red-600 mt-2 text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PaymentInitiation;