// src/types/checkout.ts

export interface PaymentMethod {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface CheckoutSession {
  sessionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutSessionRequest {
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface PaymentResult {
  status: 'success' | 'pending' | 'failed';
  transactionId?: string;
  error?: string;
}