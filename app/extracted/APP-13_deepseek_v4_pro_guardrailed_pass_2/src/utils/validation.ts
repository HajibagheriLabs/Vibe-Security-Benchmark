// src/utils/validation.ts

/**
 * Payment validation schema
 * 
 * SECURITY: Validates all payment data before sending to server
 * Server performs additional validation and authorization
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePaymentSchema(data: {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
}): ValidationResult {
  const errors: string[] = [];

  // Validate order ID (UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.orderId)) {
    errors.push('Invalid order ID');
  }

  // Validate amount (positive number, max 2 decimal places)
  if (typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('Invalid amount');
  } else if (data.amount > 1000000) {
    errors.push('Amount exceeds maximum limit');
  } else if (!/^\d+(\.\d{1,2})?$/.test(data.amount.toString())) {
    errors.push('Amount must have at most 2 decimal places');
  }

  // Validate currency (ISO 4217 code)
  const currencyRegex = /^[A-Z]{3}$/;
  if (!currencyRegex.test(data.currency)) {
    errors.push('Invalid currency code');
  }

  // Validate payment method ID
  if (typeof data.paymentMethodId !== 'string' || data.paymentMethodId.length === 0) {
    errors.push('Invalid payment method');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}