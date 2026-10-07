import { useReducer, useCallback, useMemo } from 'react';
import { PaymentProvider, CreateTransactionRequest } from './PaymentProvider';
import {
  CheckoutState,
  CheckoutAction,
  CheckoutItem,
  CustomerInfo,
  ShippingMethod,
  PaymentMethod,
  OrderSummary,
} from './types';

const initialState: CheckoutState = {
  items: [],
  customer: null,
  shippingMethod: null,
  paymentMethod: null,
  status: 'idle',
  error: null,
  transactionId: null,
  clientToken: null,
};

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'SET_CUSTOMER':
      return { ...state, customer: action.payload };
    case 'SET_SHIPPING_METHOD':
      return { ...state, shippingMethod: action.payload };
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TRANSACTION':
      return {
        ...state,
        transactionId: action.payload.transactionId,
        clientToken: action.payload.clientToken,
      };
    case 'RESET_CHECKOUT':
      return initialState;
    default:
      return state;
  }
}

interface UseCheckoutOptions {
  paymentProvider: PaymentProvider;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: Error) => void;
  returnUrl?: string;
  cancelUrl?: string;
}

export function useCheckout({
  paymentProvider,
  onSuccess,
  onError,
  returnUrl,
  cancelUrl,
}: UseCheckoutOptions) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);

  const orderSummary = useMemo((): OrderSummary => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const shipping = state.shippingMethod?.price ?? 0;
    const tax = subtotal * 0.1;
    const discount = 0;
    const total = subtotal + shipping + tax - discount;
    const currency = state.items[0]?.currency ?? 'USD';

    return { subtotal, shipping, tax, discount, total, currency };
  }, [state.items, state.shippingMethod]);

  const setItems = useCallback((items: CheckoutItem[]) => {
    dispatch({ type: 'SET_ITEMS', payload: items });
  }, []);

  const setCustomer = useCallback((customer: CustomerInfo) => {
    dispatch({ type: 'SET_CUSTOMER', payload: customer });
  }, []);

  const setShippingMethod = useCallback((method: ShippingMethod) => {
    dispatch({ type: 'SET_SHIPPING_METHOD', payload: method });
  }, []);

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method });
  }, []);

  const createTransaction = useCallback(async () => {
    if (!state.customer) {
      const error = new Error('Customer information is required');
      dispatch({ type: 'SET_ERROR', payload: error.message });
      onError?.(error);
      return;
    }

    if (state.items.length === 0) {
      const error = new Error('No items in checkout');
      dispatch({ type: 'SET_ERROR', payload: error.message });
      onError?.(error);
      return;
    }

    dispatch({ type: 'SET_STATUS', payload: 'creating' });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const request: CreateTransactionRequest = {
        amount: Math.round(orderSummary.total * 100),
        currency: orderSummary.currency,
        orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerEmail: state.customer.email,
        customerName: state.customer.name,
        metadata: {
          items: JSON.stringify(state.items.map(i => ({ id: i.id, quantity: i.quantity }))),
          shippingMethod: state.shippingMethod?.id,
          paymentMethod: state.paymentMethod?.id,
        },
        returnUrl,
        cancelUrl,
      };

      const response = await paymentProvider.createTransaction(request);

      dispatch({
        type: 'SET_TRANSACTION',
        payload: {
          transactionId: response.transactionId,
          clientToken: response.clientToken,
        },
      });
      dispatch({ type: 'SET_STATUS', payload: 'processing' });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create transaction';
      dispatch({ type: 'SET_ERROR', payload: message });
      dispatch({ type: 'SET_STATUS', payload: 'failed' });
      onError?.(error instanceof Error ? error : new Error(message));
      throw error;
    }
  }, [state, orderSummary, paymentProvider, returnUrl, cancelUrl, onError]);

  const completeCheckout = useCallback(async () => {
    if (!state.transactionId) {
      const error = new Error('No active transaction');
      dispatch({ type: 'SET_ERROR', payload: error.message });
      onError?.(error);
      return;
    }

    dispatch({ type: 'SET_STATUS', payload: 'processing' });

    try {
      const transaction = await paymentProvider.getTransactionStatus(state.transactionId);

      if (transaction.status === 'authorized' || transaction.status === 'captured') {
        dispatch({ type: 'SET_STATUS', payload: 'completed' });
        onSuccess?.(state.transactionId);
      } else if (transaction.status === 'failed') {
        dispatch({ type: 'SET_STATUS', payload: 'failed' });
        const error = new Error('Payment failed');
        dispatch({ type: 'SET_ERROR', payload: error.message });
        onError?.(error);
      } else if (transaction.status === 'cancelled') {
        dispatch({ type: 'SET_STATUS', payload: 'cancelled' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify transaction';
      dispatch({ type: 'SET_ERROR', payload: message });
      dispatch({ type: 'SET_STATUS', payload: 'failed' });
      onError?.(error instanceof Error ? error : new Error(message));
      throw error;
    }
  }, [state.transactionId, paymentProvider, onSuccess, onError]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET_CHECKOUT' });
  }, []);

  return {
    state,
    orderSummary,
    setItems,
    setCustomer,
    setShippingMethod,
    setPaymentMethod,
    createTransaction,
    completeCheckout,
    reset,
  };
}