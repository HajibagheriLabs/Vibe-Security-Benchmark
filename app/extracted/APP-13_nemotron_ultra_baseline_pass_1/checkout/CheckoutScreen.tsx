import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCheckout } from './useCheckout';
import { PaymentProvider } from './PaymentProvider';
import { CheckoutItem, ShippingMethod, PaymentMethod, CustomerInfo } from './types';

const paymentProvider = new PaymentProvider({
  apiKey: process.env.EXPO_PUBLIC_PAYMENT_API_KEY ?? '',
  environment: (__DEV__ ? 'sandbox' : 'production') as 'sandbox' | 'production',
  merchantId: process.env.EXPO_PUBLIC_MERCHANT_ID ?? '',
});

const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'standard', name: 'Standard Shipping', price: 599, currency: 'USD', estimatedDays: 5 },
  { id: 'express', name: 'Express Shipping', price: 1499, currency: 'USD', estimatedDays: 2 },
  { id: 'overnight', name: 'Overnight Shipping', price: 2999, currency: 'USD', estimatedDays: 1 },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'card_visa', type: 'card', brand: 'Visa', last4: '4242', expiryMonth: 12, expiryYear: 2025 },
  { id: 'card_mastercard', type: 'card', brand: 'Mastercard', last4: '5555', expiryMonth: 6, expiryYear: 2026 },
  { id: 'apple_pay', type: 'wallet', brand: 'Apple Pay' },
  { id: 'google_pay', type: 'wallet', brand: 'Google Pay' },
];

export function CheckoutScreen({
  initialItems,
  onComplete,
  onCancel,
}: {
  initialItems: CheckoutItem[];
  onComplete?: (transactionId: string) => void;
  onCancel?: () => void;
}) {
  const {
    state,
    orderSummary,
    setItems,
    setCustomer,
    setShippingMethod,
    setPaymentMethod,
    createTransaction,
    completeCheckout,
    reset,
  } = useCheckout({
    paymentProvider,
    onSuccess: (transactionId) => {
      Alert.alert('Success', 'Payment completed successfully!', [
        { text: 'OK', onPress: () => onComplete?.(transactionId) },
      ]);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
    returnUrl: 'myapp://checkout/success',
    cancelUrl: 'myapp://checkout/cancel',
  });

  useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems, setItems]);

  const handleCreateTransaction = async () => {
    if (!state.customer?.email || !state.customer?.name) {
      Alert.alert('Missing Information', 'Please fill in your name and email');
      return;
    }
    if (!state.shippingMethod) {
      Alert.alert('Missing Information', 'Please select a shipping method');
      return;
    }
    if (!state.paymentMethod) {
      Alert.alert('Missing Information', 'Please select a payment method');
      return;
    }

    try {
      await createTransaction();
    } catch (error) {
      // Error handled in hook
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const renderOrderSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Order Summary</Text>
      <View style={styles.summaryRow}>
        <Text>Subtotal ({state.items.length} items)</Text>
        <Text>{formatCurrency(orderSummary.subtotal, orderSummary.currency)}</Text>
      </View>
      {state.shippingMethod && (
        <View style={styles.summaryRow}>
          <Text>{state.shippingMethod.name}</Text>
          <Text>{formatCurrency(state.shippingMethod.price, orderSummary.currency)}</Text>
        </View>
      )}
      <View style={styles.summaryRow}>
        <Text>Estimated Tax</Text>
        <Text>{formatCurrency(orderSummary.tax, orderSummary.currency)}</Text>
      </View>
      <View style={[styles.summaryRow, styles.summaryTotal]}>
        <Text>Total</Text>
        <Text>{formatCurrency(orderSummary.total, orderSummary.currency)}</Text>
      </View>
    </View>
  );

  const renderCustomerForm = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={state.customer?.name ?? ''}
        onChangeText={(name) => setCustomer({ ...state.customer, name } as CustomerInfo)}
        autoCapitalize="words"
        autoCompleteType="name"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={state.customer?.email ?? ''}
        onChangeText={(email) => setCustomer({ ...state.customer, email } as CustomerInfo)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCompleteType="email"
      />
    </View>
  );

  const renderShippingSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Shipping Method</Text>
      {SHIPPING_METHODS.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.option,
            state.shippingMethod?.id === method.id && styles.optionSelected,
          ]}
          onPress={() => setShippingMethod(method)}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionName}>{method.name}</Text>
            <Text style={styles.optionDetail}>
              {method.estimatedDays} business days
            </Text>
          </View>
          <View style={styles.optionPrice}>
            <Text style={styles.optionPriceText}>
              {formatCurrency(method.price, 'USD')}
            </Text>
            <View
              style={[
                styles.radio,
                state.shippingMethod?.id === method.id && styles.radioSelected,
              ]}
            />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPaymentSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      {PAYMENT_METHODS.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.option,
            state.paymentMethod?.id === method.id && styles.optionSelected,
          ]}
          onPress={() => setPaymentMethod(method)}
        >
          <View style={styles.optionContent}>
            <Text style={styles.optionName}>
              {method.brand ?? method.type}
              {method.last4 && ` •••• ${method.last4}`}
            </Text>
            {method.expiryMonth && method.expiryYear && (
              <Text style={styles.optionDetail}>
                Expires {method.expiryMonth}/{String(method.expiryYear).slice(-2)}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.radio,
              state.paymentMethod?.id === method.id && styles.radioSelected,
            ]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItems = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Items</Text>
      {state.items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDetail}>
              Qty: {item.quantity} × {formatCurrency(item.unitPrice, item.currency)}
            </Text>
          </View>
          <Text style={styles.itemPrice}>
            {formatCurrency(item.unitPrice * item.quantity, item.currency)}
          </Text>
        </View>
      ))}
    </View>
  );

  if (state.status === 'completed') {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Order Confirmed!</Text>
        <Text style={styles.successMessage}>
          Your order has been placed successfully.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onComplete?.(state.transactionId!)}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderItems()}
        {renderOrderSummary()}
        {renderCustomerForm()}
        {renderShippingSelection()}
        {renderPaymentSelection()}

        {state.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            state.status === 'creating' && styles.buttonDisabled,
          ]}
          onPress={handleCreateTransaction}
          disabled={state.status === 'creating'}
        >
          {state.status === 'creating' ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Pay {formatCurrency(orderSummary.total, orderSummary.currency)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  optionDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  optionPrice: {
    alignItems: 'flex-end',
  },
  optionPriceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginLeft: 12,
  },
  radioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  itemDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 16,
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 12,
  },
  errorContainer: {
    backgroundColor: '#fff0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#99c2ff',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    padding: 12,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    fontSize: 64,
    color: '#34C759',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
});