'use client';

import React, { useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe with the public key. 
// In a real app, this should be an environment variable.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutButtonProps {
  priceId: string;
  onSuccessUrl: string;
  onCancelUrl: string;
}

const StripeCheckout: React.FC<CheckoutButtonProps> = ({ priceId, onSuccessUrl, onCancelUrl }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe could not be loaded.');
      }

      // Call the server-side API to create a Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
        }),
      });

      const session = await response.json();

      if (response.status !== 200) {
        throw new Error(session.message || 'Failed to create checkout session.');
      }

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      console.error('Error during checkout:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : 'Pay with Stripe'}
      </button>
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
};

export default StripeCheckout;