import { Platform } from 'react-native';

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'apple_pay' | 'google_pay';
  cardDetails?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
  billingDetails: {
    name: string;
    email: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  metadata?: Record<string, string>;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
  currency: string;
  createdAt: string;
  clientSecret?: string;
  error?: {
    code: string;
    message: string;
  };
}

export class PaymentProviderError extends Error {
  code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PaymentProviderError';
    this.code = code;
  }
}

class PaymentProviderClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // In production, these would come from environment configuration
    this.baseUrl = 'https://api.paymentprovider.com/v1';
    this.apiKey = 'pk_live_placeholder';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Platform': Platform.OS,
      'X-SDK-Version': 'react-native-1.0.0',
    };
  }

  async createTransaction(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...request,
          amount: Math.round(request.amount * 100), // Convert to cents
          platform: Platform.OS,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new PaymentProviderError(
          data.error?.code ?? 'unknown_error',
          data.error?.message ?? 'Failed to create transaction'
        );
      }

      return {
        transactionId: data.id,
        status: data.status,
        amount: data.amount / 100,
        currency: data.currency,
        createdAt: data.created_at,
        clientSecret: data.client_secret,
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        throw error;
      }
      throw new PaymentProviderError(
        'network_error',
        'Unable to reach payment provider. Please check your connection.'
      );
    }
  }
}

export const paymentProviderClient = new PaymentProviderClient();