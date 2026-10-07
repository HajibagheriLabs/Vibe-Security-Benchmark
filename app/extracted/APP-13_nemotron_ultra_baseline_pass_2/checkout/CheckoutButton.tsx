import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { useCheckout } from './CheckoutContext';
import { CreateTransactionRequest } from './PaymentProvider';

interface CheckoutButtonProps {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
  cancelUrl?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingText?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

import { ViewStyle, TextStyle } from 'react-native';

export const CheckoutButton: React.FC<CheckoutButtonProps> = ({
  amount,
  currency,
  orderId,
  customerEmail,
  customerName,
  metadata,
  returnUrl,
  cancelUrl,
  children,
  disabled = false,
  style,
  textStyle,
  loadingText = 'Processing...',
  onSuccess,
  onError,
}) => {
  const { status, initiateCheckout, error } = useCheckout();

  const handlePress = async () => {
    const request: CreateTransactionRequest = {
      amount,
      currency,
      orderId,
      customerEmail,
      customerName,
      metadata,
      returnUrl,
      cancelUrl,
    };

    try {
      await initiateCheckout(request);
      onSuccess?.();
    } catch (err) {
      onError?.(err as Error);
    }
  };

  const isLoading = status === 'loading' || status === 'processing';

  return (
    <TouchableOpacity
      style={[styles.button, style, disabled || isLoading ? styles.disabled : {}]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
          <Text style={[styles.buttonText, textStyle, styles.loadingText]}>{loadingText}</Text>
        </>
      ) : (
        children || <Text style={[styles.buttonText, textStyle]}>Pay Now</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 50,
  },
  disabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginLeft: 8,
  },
  spinner: {
    marginRight: 8,
  },
});