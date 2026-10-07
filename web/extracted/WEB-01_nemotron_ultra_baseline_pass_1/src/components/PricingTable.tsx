'use client';

import { PaymentButton } from './PaymentButton';

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  interval: 'month' | 'year';
  features: string[];
  highlighted?: boolean;
  metadata?: Record<string, string>;
}

interface PricingTableProps {
  plans: Plan[];
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export function PricingTable({
  plans,
  customerEmail,
  successUrl,
  cancelUrl,
}: PricingTableProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="list">
      {plans.map((plan) => (
        <article
          key={plan.id}
          className={`relative rounded-xl border p-6 transition-shadow ${
            plan.highlighted
              ? 'border-primary ring-2 ring-primary/20 shadow-lg'
              : 'border-gray-200 hover:shadow-md dark:border-gray-700'
          }`}
          role="listitem"
        >
          {plan.highlighted && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Most Popular
            </div>
          )}

          <header className="mb-6 text-center">
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-2 flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-muted-foreground">/{plan.interval}</span>
            </div>
          </header>

          <ul className="mb-6 space-y-3" role="list">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <PaymentButton
            priceId={plan.priceId}
            planName={plan.name}
            customerEmail={customerEmail}
            metadata={plan.metadata}
            successUrl={successUrl}
            cancelUrl={cancelUrl}
            className="w-full"
          >
            Get Started
          </PaymentButton>
        </article>
      ))}
    </div>
  );
}