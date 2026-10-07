'use client';

import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

// Initialize Stripe with your publishable key
// In a real app, you might want to memoize this or load it once at the app level
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StripeCheckoutButtonProps {
  priceId: string;
  onSuccessUrl: string;
  onCancelUrl: string;
  className?: string;
}

export default function StripeCheckoutButton({
  priceId,
  onSuccessUrl,
  onCancelUrl,
  className,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Call your API route to create a Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          onSuccessUrl,
          onCancelUrl,
        }),
      });

      const session = await response.json();

      if (response.status !== 200) {
        throw new Error(session.message || 'Failed to create session');
      }

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Error initiating checkout:', error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? 'Processing...' : 'Checkout'}
    </button>
  );
}