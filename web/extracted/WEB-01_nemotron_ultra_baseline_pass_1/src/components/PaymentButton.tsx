'use client';

import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface PaymentButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  priceId: string;
  planName?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
  children?: React.ReactNode;
  loadingText?: string;
}

export const PaymentButton = forwardRef<HTMLButtonElement, PaymentButtonProps>(
  (
    {
      priceId,
      planName,
      customerEmail,
      metadata,
      successUrl,
      cancelUrl,
      children = 'Subscribe',
      loadingText = 'Redirecting...',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const { initiateCheckout, isLoading, error } = useStripeCheckout();

    const handleClick = async () => {
      try {
        await initiateCheckout({
          priceId,
          successUrl,
          cancelUrl,
          customerEmail,
          metadata: {
            planName,
            ...metadata,
          },
        });
      } catch {
        // Error handled by hook
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? loadingText : children}
        {error && (
          <span role="alert" className="sr-only">
            Error: {error}
          </span>
        )}
      </button>
    );
  }
);

PaymentButton.displayName = 'PaymentButton';