import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useCheckout } from './CheckoutContext';
import { CheckoutState } from './CheckoutContext';

interface CheckoutStatusProps {
  renderIdle?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderProcessing?: () => React.ReactNode;
  renderSuccess?: (transaction: CheckoutState['transaction']) => React.ReactNode;
  renderError?: (error: CheckoutState['error']) => React.ReactNode;
}

export const CheckoutStatus: React.FC<CheckoutStatusProps> = ({
  renderIdle,
  renderLoading,
  renderProcessing,
  renderSuccess,
  renderError,
}) => {
  const { status, transaction, error } = useCheckout();

  switch (status) {
    case 'idle':
      return renderIdle?.() || null;
    case 'loading':
      return renderLoading?.() || (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.statusText}>Creating transaction...</Text>
        </View>
      );
    case 'processing':
      return renderProcessing?.() || (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.statusText}>Opening payment page...</Text>
        </View>
      );
    case 'success':
      return renderSuccess?.(transaction) || (
        <View style={styles.centered}>
          <Text style={[styles.statusText, styles.successText]}>Payment successful!</Text>
          {transaction && (
            <Text style={styles.detailText}>Transaction ID: {transaction.transactionId}</Text>
          )}
        </View>
      );
    case 'error':
      return renderError?.(error) || (
        <View style={styles.centered}>
          <Text style={[styles.statusText, styles.errorText]}>Payment failed</Text>
          {error && (
            <Text style={styles.detailText}>{error.message}</Text>
          )}
        </View>
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  centered: {
    padding: 24,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  successText: {
    color: '#34C759',
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
});