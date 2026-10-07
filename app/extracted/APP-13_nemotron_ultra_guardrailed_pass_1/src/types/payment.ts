// src/types/payment.ts
export interface PaymentRequest {
  amount_cents: number;
  currency: string; // ISO 4217, validated server-side
  item_id: string;  // UUID format, validated server-side
  metadata: Record<string, string>;
}

export interface PaymentResponse {
  transaction_id: string;
  client_token: string; // Short-lived, single-use token for native payment sheet
  expires_at: string;   // ISO 8601
}