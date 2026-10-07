// components/PaymentInitiation.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Rule 1: Secret stored in NEXT_PUBLIC_STRIPE_PUBLIC_KEY (client-safe)
// Rule 1: Secret stored in STRIPE_SECRET_KEY (server-only)
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '';

interface PaymentInitiationProps {
  priceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// Rule 4: Verify @stripe/stripe-js exists and pin version in package.json
// Source: https://www.npmjs.com/package/@stripe/stripe-js
// Version: ^2.1.11

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.error('Stripe Publishable Key is missing');
      return null;
    }
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export default function PaymentInitiation({ priceId, onSuccess, onCancel }: PaymentInitiationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // Rule 1: Client calls our own endpoint, not Stripe directly
      // Rule 2: Session identity verified server-side
      // Rule 3: Schema validation handled server-side via Zod/Pydantic
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      const { sessionId, error: serverError } = await response.json();

      if (serverError) {
        throw new Error(serverError);
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        throw new Error(stripeError.message || 'Stripe checkout failed');
      }
    } catch (err: any) {
      console.error('Payment initiation failed:', err);
      setError(err.message || 'An unexpected error occurred');
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Processing...' : 'Checkout'}
      </button>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}