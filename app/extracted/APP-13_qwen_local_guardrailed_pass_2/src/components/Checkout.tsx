import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { createPaymentTransaction } from '../services/paymentService';

interface CheckoutProps {
  amount: number;
  currency: string;
  onSuccess: (transactionId: string) => void;
  onError: (error: Error) => void;
}

export const Checkout: React.FC<CheckoutProps> = ({ amount, currency, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Call gateway service to create transaction
      const result = await createPaymentTransaction({ amount, currency });
      onSuccess(result.transactionId);
    } catch (error) {
      onError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [loading, amount, currency, onSuccess, onError]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Total: ${amount.toFixed(2)} {currency}</Text>
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Pay Now</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});