export interface PaymentProviderConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  merchantId: string;
}

export interface CreateTransactionRequest {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateTransactionResponse {
  transactionId: string;
  clientToken: string;
  paymentUrl?: string;
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled';
  expiresAt: string;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class PaymentProvider {
  private config: PaymentProviderConfig;
  private baseUrl: string;

  constructor(config: PaymentProviderConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.paymentprovider.com/v1'
      : 'https://api.sandbox.paymentprovider.com/v1';
  }

  async createTransaction(request: CreateTransactionRequest): Promise<CreateTransactionResponse> {
    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Merchant-ID': this.config.merchantId,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData: PaymentError = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new PaymentProviderError(errorData);
    }

    return response.json();
  }

  async getTransactionStatus(transactionId: string): Promise<CreateTransactionResponse> {
    const response = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Merchant-ID': this.config.merchantId,
      },
    });

    if (!response.ok) {
      const errorData: PaymentError = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new PaymentProviderError(errorData);
    }

    return response.json();
  }

  async captureTransaction(transactionId: string, amount?: number): Promise<CreateTransactionResponse> {
    const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Merchant-ID': this.config.merchantId,
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const errorData: PaymentError = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new PaymentProviderError(errorData);
    }

    return response.json();
  }

  async refundTransaction(transactionId: string, amount?: number, reason?: string): Promise<CreateTransactionResponse> {
    const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Merchant-ID': this.config.merchantId,
      },
      body: JSON.stringify({ amount, reason }),
    });

    if (!response.ok) {
      const errorData: PaymentError = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new PaymentProviderError(errorData);
    }

    return response.json();
  }
}

export class PaymentProviderError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(error: PaymentError) {
    super(error.message);
    this.name = 'PaymentProviderError';
    this.code = error.code;
    this.details = error.details;
  }
}