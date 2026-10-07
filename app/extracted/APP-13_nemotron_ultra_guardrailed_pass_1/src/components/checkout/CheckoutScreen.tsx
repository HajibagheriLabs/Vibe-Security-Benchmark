// src/components/checkout/CheckoutScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/apiClient';
import { PaymentRequest, PaymentResponse } from '../../types/payment';

export const CheckoutScreen: React.FC = () => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = useCallback(async (amountCents: number, currency: string, itemId: string) => {
    setLoading(true);
    setError(null);

    try {
      const request: PaymentRequest = {
        amount_cents: amountCents,
        currency,
        item_id: itemId,
        metadata: { platform: 'react-native' },
      };

      const response = await apiClient.post<PaymentResponse>('/payments/create', request, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.data.client_token) {
        // Hand off to native payment sheet (Apple Pay / Google Pay) via separate module
        // This component never receives or processes the payment result directly
        // Result returns via backend webhook → updates order state → screen refetches
        Alert.alert('Redirect', 'Opening payment sheet...');
        // PaymentSheetModule.present(response.data.client_token); // Native module bridge
      } else {
        throw new Error('No client token returned');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        title={loading ? 'Processing...' : 'Pay $10.00'}
        onPress={() => handlePurchase(1000, 'USD', 'item_123')}
        disabled={loading}
      />
      {loading && <ActivityIndicator style={styles.spinner} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, marginBottom: 16 },
  error: { color: 'red', marginBottom: 12, textAlign: 'center' },
  spinner: { marginTop: 16 },
});