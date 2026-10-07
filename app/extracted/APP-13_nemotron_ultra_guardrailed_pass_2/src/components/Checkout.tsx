import React, { useState } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface CheckoutProps {
  amountCents: number;
  currency: string;
  orderId: string;
  onSuccess: (transactionId: string) => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  amountCents,
  currency,
  orderId,
  onSuccess,
}) => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const response = await api.post<{ transactionId: string }>(
        '/payments/transactions',
        { amountCents, currency, orderId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      onSuccess(response.data.transactionId);
    } catch (error: any) {
      const message = error.response?.data?.message ?? 'Payment failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>
        Pay {currency.toUpperCase()} {(amountCents / 100).toFixed(2)}
      </Text>
      <Button
        title={loading ? 'Processing…' : 'Confirm Payment'}
        onPress={handlePay}
        disabled={loading}
        color="#007AFF"
      />
      {loading && <ActivityIndicator style={styles.spinner} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  amount: { fontSize: 24, fontWeight: '600', marginBottom: 16 },
  spinner: { marginTop: 12 },
});