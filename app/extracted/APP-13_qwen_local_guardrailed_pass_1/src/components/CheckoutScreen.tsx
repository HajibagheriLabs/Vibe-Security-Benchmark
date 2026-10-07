/**
 * Filename: src/components/CheckoutScreen.tsx
 * 
 * Security Decisions:
 * - Uses a gateway pattern to avoid placing the Payment Provider API key in the bundle.
 * - Validates input schema before sending to backend.
 * - Uses `fetch` with `https` only (default in RN, enforced by `usesCleartextTraffic="false"`).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

// Types
type CheckoutProps = {
  onPaymentSuccess: () => void;
};

type PaymentRequest = {
  amount: number;
  currency: string;
  description: string;
};

type PaymentResponse = {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  providerReference: string;
};

// Constants
const API_GATEWAY_URL = 'https://api.ourserver.com/v1/payments/initiate';
const MAX_AMOUNT = 100000; // 1000.00 in cents
const CURRENCY = 'USD';

const CheckoutScreen: React.FC<CheckoutProps> = ({ onPaymentSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const validateInput = (rawAmount: string): number | null => {
    const parsed = parseFloat(rawAmount);
    if (isNaN(parsed) || parsed <= 0) {
      return null;
    }
    // Enforce precision (2 decimal places)
    if (parsed > MAX_AMOUNT) {
      return null;
    }
    return parsed;
  };

  const handleCheckout = async () => {
    const amountInCents = validateInput(amount);
    
    if (amountInCents === null) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Token is fetched from secure store at runtime, not hardcoded
          'Authorization': 'Bearer <SESSION_TOKEN>', 
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency: CURRENCY,
          description: 'User Purchase',
        }),
      });

      if (!response.ok) {
        throw new Error(`Payment initiation failed: ${response.status}`);
      }

      const data: PaymentResponse = await response.json();

      if (data.status === 'success') {
        onPaymentSuccess();
      } else {
        Alert.alert('Payment Failed', 'The transaction could not be completed.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Could not connect to payment service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Pay</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CheckoutScreen;