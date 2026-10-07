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
  Platform,
} from 'react-native';
import * as Keychain from 'react-native-keychain';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/apiClient';
import { PaymentGateway } from '../../services/paymentGateway';
import { validatePaymentSchema } from '../../utils/validation';

interface CheckoutScreenProps {
  orderId: string;
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet';
  last4?: string;
  brand?: string;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  orderId,
  onSuccess,
  onCancel,
}) => {
  const { session, isAuthenticated } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch order details and payment methods on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return;
    }
    fetchOrderDetails();
    fetchPaymentMethods();
  }, [orderId, isAuthenticated]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch order details from our server (never trust client-side amounts)
      const orderDetails = await apiClient.getOrderDetails(orderId, session?.accessToken);
      setAmount(orderDetails.amount.toString());
      setCurrency(orderDetails.currency);
    } catch (err) {
      setError('Failed to load order details');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      // Fetch saved payment methods from our server
      const methods = await apiClient.getPaymentMethods(session?.accessToken);
      setPaymentMethods(methods);
    } catch (err) {
      setError('Failed to load payment methods');
    }
  };

  const handleCheckout = useCallback(async () => {
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Validate payment data before sending
      const paymentData = {
        orderId,
        amount: parseFloat(amount),
        currency,
        paymentMethodId: selectedPaymentMethod,
      };

      const validationResult = validatePaymentSchema(paymentData);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Call our server endpoint (which securely calls the payment provider)
      const result = await PaymentGateway.createTransaction(
        paymentData,
        session?.accessToken
      );

      if (result.success) {
        onSuccess(result.transactionId);
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      Alert.alert('Payment Error', 'Unable to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [orderId, amount, currency, selectedPaymentMethod, session, onSuccess]);

  const handleAddPaymentMethod = useCallback(() => {
    // Navigate to add payment method screen
    // Payment details are tokenized by the payment provider SDK
    // Never store raw card data on device
    Alert.alert('Add Payment Method', 'Redirecting to secure payment method setup...');
  }, []);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to continue</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      
      {/* Order Summary */}
      <View style={styles.orderSummary}>
        <Text style={styles.label}>Order ID: {orderId}</Text>
        <Text style={styles.amount}>
          {currency} {amount}
        </Text>
      </View>

      {/* Payment Methods */}
      <Text style={styles.sectionTitle}>Select Payment Method</Text>
      {paymentMethods.length === 0 ? (
        <TouchableOpacity
          style={styles.addPaymentButton}
          onPress={handleAddPaymentMethod}
        >
          <Text style={styles.addPaymentText}>+ Add Payment Method</Text>
        </TouchableOpacity>
      ) : (
        paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
            ]}
            onPress={() => setSelectedPaymentMethod(method.id)}
          >
            <Text style={styles.paymentMethodText}>
              {method.type === 'card' 
                ? `${method.brand} ending in ${method.last4}`
                : `${method.type} wallet`}
            </Text>
          </TouchableOpacity>
        ))
      )}

      {/* Error Display */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.checkoutButton,
            (!selectedPaymentMethod || isProcessing) && styles.disabledButton,
          ]}
          onPress={handleCheckout}
          disabled={!selectedPaymentMethod || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.checkoutButtonText}>Pay Now</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  orderSummary: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  paymentMethod: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedPaymentMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  paymentMethodText: {
    fontSize: 16,
  },
  addPaymentButton: {
    padding: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  addPaymentText: {
    color: '#007AFF',
    fontSize: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});