// CheckoutScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

// Mock types for payment provider
interface PaymentResponse {
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
}

const API_BASE_URL = 'https://api.payment-provider.com/v1/transactions';

const CheckoutScreen = () => {
  const [amount, setAmount] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  const validateInputs = (): boolean => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return false;
    }
    if (!cardNumber || cardNumber.length < 16) {
      Alert.alert('Error', 'Please enter a valid card number.');
      return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setResponseMessage(null);

    try {
      const payload = {
        amount: parseFloat(amount),
        currency: 'USD',
        card: {
          number: cardNumber,
          expiry: '12/25', // Mock expiry
          cvc: '123',      // Mock CVC
        },
      };

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer MOCK_API_KEY',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PaymentResponse = await response.json();

      if (data.status === 'success') {
        setResponseMessage(`Success! Transaction ID: ${data.transactionId}`);
        Alert.alert('Payment Successful', `Transaction ID: ${data.transactionId}`);
      } else {
        setResponseMessage(`Failed: ${data.message || 'Unknown error'}`);
        Alert.alert('Payment Failed', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setResponseMessage('Network or server error. Please try again.');
      Alert.alert('Error', 'Could not connect to payment provider.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount ($)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChangeText={setCardNumber}
          maxLength={19}
        />
      </View>

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

      {responseMessage && (
        <Text style={styles.responseText}>{responseMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  responseText: {
    marginTop: 15,
    textAlign: 'center',
    color: '#333',
    fontSize: 14,
  },
});

export default CheckoutScreen;