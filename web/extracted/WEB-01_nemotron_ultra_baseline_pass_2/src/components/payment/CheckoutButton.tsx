'use client';

import { PaymentInitiator } from './PaymentInitiator';

interface CheckoutButtonProps {
  priceId: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: Error) => void;
}

export function CheckoutButton({
  priceId,
  customerEmail,
  metadata,
  className = 'px-6 py-3 bg-stripe-600 text-white font-medium rounded-lg hover:bg-stripe-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  children = 'Start Subscription',
  onSuccess,
  onError,
}: CheckoutButtonProps) {
  return (
    <PaymentInitiator
      priceId={priceId}
      customerEmail={customerEmail}
      metadata={metadata}
      onSuccess={onSuccess}
      onError={onError}
    >
      {({ startCheckout, loading, error }) => (
        <button
          type="button"
          onClick={startCheckout}
          disabled={loading}
          className={className}
          aria-busy={loading}
          aria-disabled={loading}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Redirecting...
            </>
          ) : (
            children
          )}
        </button>
      )}
    </PaymentInitiator>
  );
}