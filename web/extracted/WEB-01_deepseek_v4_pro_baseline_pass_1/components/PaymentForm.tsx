'use client';

import { useState, FormEvent } from 'react';
import PaymentButton from './PaymentButton';

interface PaymentFormProps {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  allowQuantity?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  className?: string;
}

export default function PaymentForm({
  priceId,
  successUrl,
  cancelUrl,
  allowQuantity = false,
  minQuantity = 1,
  maxQuantity = 10,
  className,
}: PaymentFormProps) {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (e: FormEvent<HTMLInputElement>) => {
    const value = parseInt(e.currentTarget.value, 10);
    if (!isNaN(value)) {
      setQuantity(Math.min(Math.max(value, minQuantity), maxQuantity));
    }
  };

  return (
    <div className={className || 'flex flex-col gap-4 max-w-sm'}>
      {allowQuantity && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="quantity"
            className="text-sm font-medium text-gray-700"
          >
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            min={minQuantity}
            max={maxQuantity}
            value={quantity}
            onChange={handleQuantityChange}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      <PaymentButton
        priceId={priceId}
        quantity={quantity}
        successUrl={successUrl}
        cancelUrl={cancelUrl}
        buttonText={`Pay $${(quantity * 0).toFixed(2)}`}
      />
    </div>
  );
}