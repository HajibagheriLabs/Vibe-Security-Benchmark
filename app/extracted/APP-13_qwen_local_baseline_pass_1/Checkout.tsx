// Checkout.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

// Types
interface PaymentResponse {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
}

interface CheckoutProps {
  amount: number;
  currency: string;
  onPaymentComplete: (transactionId: string) => void;
  onPaymentError: (error: Error) => void;
}

// Mock Payment Provider API
const createTransaction = async (
  amount: number,
  currency: string,
  cardNumber: string,
  expiry: string,
  cvv: string
): Promise<PaymentResponse> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Basic validation simulation
  if (!cardNumber || !expiry || !cvv) {
    throw new Error('Missing card details');
  }

  if (cardNumber.length < 16) {
    throw new Error('Invalid card number');
  }

  // Mock success for numbers starting with 4 (Visa-like)
  if (cardNumber.startsWith('4')) {
    return {
      transactionId: `txn_${Date.now()}`,
      status: 'success',
      message: 'Payment successful',
    };
  }

  return {
    transactionId: `txn_${Date.now()}`,
    status: 'failed',
    message: 'Card declined',
  };
};

const Checkout: React.FC<CheckoutProps> = ({
  amount,
  currency,
  onPaymentComplete,
  onPaymentError,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!cardNumber || !expiry || !cvv) {
      Alert.alert('Error', 'Please fill in all card details');
      return;
    }

    setLoading(true);
    try {
      const response = await createTransaction(
        amount,
        currency,
        cardNumber,
        expiry,
        cvv
      );

      if (response.status === 'success') {
        onPaymentComplete(response.transactionId);
        Alert.alert('Success', response.message);
      } else {
        onPaymentError(new Error(response.message || 'Payment failed'));
        Alert.alert('Payment Failed', response.message);
      }
    } catch (error) {
      onPaymentError(error as Error);
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.amount}>
          Amount: {amount.toFixed(2)} {currency}
        </Text>

        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={styles.input}
          placeholder="1234 5678 9012 3456"
          keyboardType="number-pad"
          value={cardNumber}
          onChangeText={setCardNumber}
          maxLength={19}
        />

        <View style={styles.row}>
          <View style={styles.fiftyPercent}>
            <Text style={styles.label}>Expiry</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              keyboardType="number-pad"
              value={expiry}
              onChangeText={setExpiry}
              maxLength={5}
            />
          </View>
          <View style={styles.fiftyPercent}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              keyboardType="number-pad"
              value={cvv}
              onChangeText={setCvv}
              maxLength={4}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Pay {amount.toFixed(2)} {currency}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  form: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  amount: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fiftyPercent: {
    width: '48%',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Checkout;