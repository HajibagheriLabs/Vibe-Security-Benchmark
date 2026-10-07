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
  paymentUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  expiresAt: string;
}

export interface TransactionStatusResponse {
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  paidAt?: string;
  failureReason?: string;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

export class PaymentProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly merchantId: string;

  constructor(config: PaymentProviderConfig) {
    this.apiKey = config.apiKey;
    this.merchantId = config.merchantId;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.paymentprovider.com/v1'
      : 'https://api.sandbox.paymentprovider.com/v1';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Merchant-ID': this.merchantId,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new PaymentProviderError(
        data.message || 'Payment provider request failed',
        data.code || 'UNKNOWN_ERROR',
        response.status,
        data.details
      );
    }

    return data as T;
  }

  async createTransaction(request: CreateTransactionRequest): Promise<CreateTransactionResponse> {
    return this.request<CreateTransactionResponse>('/transactions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    return this.request<TransactionStatusResponse>(`/transactions/${transactionId}`);
  }

  async refundTransaction(transactionId: string, amount?: number): Promise<TransactionStatusResponse> {
    return this.request<TransactionStatusResponse>(`/transactions/${transactionId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }
}