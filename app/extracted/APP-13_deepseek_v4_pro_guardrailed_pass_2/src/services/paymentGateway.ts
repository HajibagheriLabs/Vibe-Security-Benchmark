// src/services/paymentGateway.ts

import { apiClient } from './apiClient';

interface TransactionRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
}

interface TransactionResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Payment Gateway Service
 * 
 * SECURITY: All payment provider API calls are made from our server.
 * The mobile app never directly calls the payment provider.
 * This prevents exposure of API keys and ensures server-side validation.
 */
export class PaymentGateway {
  /**
   * Create a transaction via our secure backend
   * The backend validates the request, checks authorization,
   * and then calls the payment provider API
   */
  static async createTransaction(
    request: TransactionRequest,
    accessToken?: string
  ): Promise<TransactionResponse> {
    try {
      // Call our server endpoint (not the payment provider directly)
      const response = await apiClient.post(
        '/api/payments/transactions',
        request,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return {
        success: true,
        transactionId: response.data.transactionId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Transaction failed',
      };
    }
  }
}