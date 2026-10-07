import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { PaymentProvider, PaymentProviderConfig, CreateTransactionRequest, CreateTransactionResponse, PaymentProviderError } from './PaymentProvider';

export interface CheckoutState {
  status: 'idle' | 'loading' | 'processing' | 'success' | 'error';
  transaction?: CreateTransactionResponse;
  error?: PaymentProviderError;
  isWebViewVisible: boolean;
}

type CheckoutAction =
  | { type: 'START_CHECKOUT' }
  | { type: 'TRANSACTION_CREATED'; payload: CreateTransactionResponse }
  | { type: 'CHECKOUT_ERROR'; payload: PaymentProviderError }
  | { type: 'SHOW_WEBVIEW' }
  | { type: 'HIDE_WEBVIEW' }
  | { type: 'RESET' };

const initialState: CheckoutState = {
  status: 'idle',
  isWebViewVisible: false,
};

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'START_CHECKOUT':
      return { ...state, status: 'loading', error: undefined };
    case 'TRANSACTION_CREATED':
      return { ...state, status: 'processing', transaction: action.payload };
    case 'CHECKOUT_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'SHOW_WEBVIEW':
      return { ...state, isWebViewVisible: true };
    case 'HIDE_WEBVIEW':
      return { ...state, isWebViewVisible: false };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface CheckoutContextValue extends CheckoutState {
  initiateCheckout: (request: CreateTransactionRequest) => Promise<void>;
  closeWebView: () => void;
  reset: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

interface CheckoutProviderProps {
  children: ReactNode;
  config: PaymentProviderConfig;
}

export function CheckoutProvider({ children, config }: CheckoutProviderProps) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);
  const provider = new PaymentProvider(config);

  const initiateCheckout = useCallback(async (request: CreateTransactionRequest) => {
    dispatch({ type: 'START_CHECKOUT' });
    try {
      const response = await provider.createTransaction(request);
      dispatch({ type: 'TRANSACTION_CREATED', payload: response });
      dispatch({ type: 'SHOW_WEBVIEW' });
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        dispatch({ type: 'CHECKOUT_ERROR', payload: error });
      } else {
        dispatch({
          type: 'CHECKOUT_ERROR',
          payload: new PaymentProviderError(
            'An unexpected error occurred',
            'UNEXPECTED_ERROR',
            500
          ),
        });
      }
    }
  }, [provider]);

  const closeWebView = useCallback(() => {
    dispatch({ type: 'HIDE_WEBVIEW' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <CheckoutContext.Provider value={{ ...state, initiateCheckout, closeWebView, reset }}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
}