// src/components/checkout/CheckoutScreen.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useCheckout } from '../../hooks/useCheckout';
import { validateAmount, validateCurrency } from '../../utils/validation';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { TransactionStatus } from './TransactionStatus';
import type { PaymentMethod, CheckoutSession } from '../../types/checkout';

interface CheckoutScreenProps {
  route: {
    params: {
      sessionId?: string;
    };
  };
  navigation: any;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ route, navigation }) => {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);

  const { createCheckoutSession, processPayment, getSessionStatus } = useCheckout();

  // Load existing session if provided (e.g., from deep link)
  useEffect(() => {
    const loadSession = async () => {
      if (route.params?.sessionId) {
        try {
          const existingSession = await getSessionStatus(route.params.sessionId);
          if (existingSession) {
            setSession(existingSession);
            setAmount(existingSession.amount.toString());
            setCurrency(existingSession.currency);
          }
        } catch (err) {
          setError('Invalid checkout session');
        }
      }
    };
    loadSession();
  }, [route.params?.sessionId]);

  const handleCreateTransaction = useCallback(async () => {
    try {
      setError(null);
      setIsProcessing(true);

      // Validate inputs client-side (server re-validates)
      const validationError = validateAmount(amount) || validateCurrency(currency);
      if (validationError) {
        setError(validationError);
        return;
      }

      if (!selectedMethod) {
        setError('Please select a payment method');
        return;
      }

      // Create checkout session on our backend
      const checkoutSession = await createCheckoutSession({
        amount: parseFloat(amount),
        currency,
        paymentMethod: selectedMethod.id,
      });

      setSession(checkoutSession);

      // Process payment through our backend gateway
      const result = await processPayment(checkoutSession.sessionId);

      if (result.status === 'success') {
        Alert.alert(
          'Payment Successful',
          'Your transaction has been completed.',
          [{ text: 'OK', onPress: () => navigation.navigate('OrderConfirmation', {
            transactionId: result.transactionId,
          })}]
        );
      } else if (result.status === 'pending') {
        Alert.alert(
          'Payment Pending',
          'Your transaction is being processed. We will notify you once completed.'
        );
      } else {
        setError('Payment failed. Please try again.');
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred while processing your payment');
    } finally {
      setIsProcessing(false);
    }
  }, [amount, currency, selectedMethod, createCheckoutSession, processPayment, navigation]);

  const handleAmountChange = (value: string) => {
    // Basic input sanitization - only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setAmount(sanitized);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.subtitle}>Secure payment processing</Text>
      </View>

      {session ? (
        <TransactionStatus session={session} />
      ) : (
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!isProcessing}
              accessibilityLabel="Payment amount"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.currencySelector}>
              {['USD', 'EUR', 'GBP'].map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyButton,
                    currency === curr && styles.currencyButtonActive,
                  ]}
                  onPress={() => setCurrency(curr)}
                  disabled={isProcessing}
                >
                  <Text style={[
                    styles.currencyText,
                    currency === curr && styles.currencyTextActive,
                  ]}>
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <PaymentMethodSelector
            selectedMethod={selectedMethod}
            onSelect={setSelectedMethod}
            disabled={isProcessing}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
            onPress={handleCreateTransaction}
            disabled={isProcessing || !amount || !selectedMethod}
            accessibilityRole="button"
            accessibilityLabel="Process payment"
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Pay Securely</Text>
            )}
          </TouchableOpacity>

          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your payment is encrypted and processed securely
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  currencyText: {
    fontSize: 16,
    color: '#333333',
  },
  currencyTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  securityIcon: {
    fontSize: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#666666',
  },
});