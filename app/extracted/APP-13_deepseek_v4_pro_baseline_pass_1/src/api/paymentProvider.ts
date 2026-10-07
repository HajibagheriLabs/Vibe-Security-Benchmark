import { Platform } from 'react-native';

export interface PaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: {
    type: 'card' | 'apple_pay' | 'google_pay';
    token?: string;
    cardDetails?: {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    };
  };
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
  currency: string;
  createdAt: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaymentProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.paymentprovider.com/v1';
const DEFAULT_TIMEOUT_MS = 30000;

export class PaymentProviderClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: PaymentProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async createTransaction(request: PaymentRequest): Promise<PaymentResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Platform': Platform.OS,
          'X-Client-Version': '1.0.0',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `Payment provider error (${response.status}): ${errorBody || response.statusText}`,
        );
      }

      const data = (await response.json()) as PaymentResponse;
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Payment request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}