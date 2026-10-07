'use client';

import { useState, useCallback } from 'react';
import { getStripe } from '@/lib/stripe';

interface PaymentInitiatorProps {
  priceId: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: Error) => void;
  onLoadingChange?: (loading: boolean) => void;
  children: (props: { startCheckout: () => Promise<void>; loading: boolean; error: Error | null }) => React.ReactNode;
}

export function PaymentInitiator({
  priceId,
  customerEmail,
  metadata,
  onSuccess,
  onError,
  onLoadingChange,
  children,
}: PaymentInitiatorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startCheckout = useCallback(async () => {
    setLoading(true);
    onLoadingChange?.(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          customerEmail,
          metadata,
          successUrl: typeof window !== 'undefined' ? `${window.location.origin}/success` : undefined,
          cancelUrl: typeof window !== 'undefined' ? `${window.location.origin}/pricing` : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }

      onSuccess?.(data.sessionId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [priceId, customerEmail, metadata, onSuccess, onError, onLoadingChange]);

  return <>{children({ startCheckout, loading, error })}</>;
}