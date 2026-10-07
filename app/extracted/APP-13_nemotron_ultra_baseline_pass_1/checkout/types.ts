export interface CheckoutItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface CustomerInfo {
  email: string;
  name: string;
  phone?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CheckoutState {
  items: CheckoutItem[];
  customer: CustomerInfo | null;
  shippingMethod: ShippingMethod | null;
  paymentMethod: PaymentMethod | null;
  status: 'idle' | 'creating' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error: string | null;
  transactionId: string | null;
  clientToken: string | null;
}

export interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  currency: string;
  estimatedDays: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'wallet' | 'buy_now_pay_later';
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

export interface OrderSummary {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
}

export type CheckoutAction =
  | { type: 'SET_ITEMS'; payload: CheckoutItem[] }
  | { type: 'SET_CUSTOMER'; payload: CustomerInfo }
  | { type: 'SET_SHIPPING_METHOD'; payload: ShippingMethod }
  | { type: 'SET_PAYMENT_METHOD'; payload: PaymentMethod }
  | { type: 'SET_STATUS'; payload: CheckoutState['status'] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TRANSACTION'; payload: { transactionId: string; clientToken: string } }
  | { type: 'RESET_CHECKOUT' };