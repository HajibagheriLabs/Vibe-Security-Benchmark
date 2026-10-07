import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  PaymentProviderClient,
  PaymentRequest,
  PaymentResponse,
} from '../api/paymentProvider';

export interface CheckoutComponentProps {
  paymentProviderClient: PaymentProviderClient;
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  onSuccess?: (response: PaymentResponse) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

type PaymentMethodType = 'card' | 'apple_pay' | 'google_pay';

interface CardFormState {
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
}

const INITIAL_CARD_FORM: CardFormState = {
  number: '',
  expMonth: '',
  expYear: '',
  cvc: '',
};

export const CheckoutComponent: React.FC<CheckoutComponentProps> = ({
  paymentProviderClient,
  amount,
  currency = 'USD',
  customerId,
  metadata,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
  const [cardForm, setCardForm] = useState<CardFormState>(INITIAL_CARD_FORM);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedAmount = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }, [amount, currency]);

  const isApplePayAvailable = Platform.OS === 'ios';
  const isGooglePayAvailable = Platform.OS === 'android';

  const validateCardForm = useCallback((): string | null => {
    const { number, expMonth, expYear, cvc } = cardForm;

    const digitsOnly = number.replace(/\s/g, '');
    if (digitsOnly.length < 12 || digitsOnly.length > 19) {
      return 'Please enter a valid card number.';
    }

    const month = parseInt(expMonth, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      return 'Expiration month must be between 01 and 12.';
    }

    const year = parseInt(expYear, 10);
    const currentYear = new Date().getFullYear() % 100;
    if (isNaN(year) || year < currentYear || year > currentYear + 30) {
      return 'Please enter a valid expiration year.';
    }

    if (cvc.length < 3 || cvc.length > 4) {
      return 'Please enter a valid CVC.';
    }

    return null;
  }, [cardForm]);

  const buildPaymentRequest = useCallback((): PaymentRequest => {
    const baseRequest: PaymentRequest = {
      amount,
      currency,
      paymentMethod: {
        type: selectedMethod,
      },
    };

    if (customerId) {
      baseRequest.customerId = customerId;
    }

    if (metadata) {
      baseRequest.metadata = metadata;
    }

    if (selectedMethod === 'card') {
      baseRequest.paymentMethod.cardDetails = {
        number: cardForm.number.replace(/\s/g, ''),
        expMonth: parseInt(cardForm.expMonth, 10),
        expYear: parseInt(cardForm.expYear, 10),
        cvc: cardForm.cvc,
      };
    }

    return baseRequest;
  }, [amount, currency, selectedMethod, cardForm, customerId, metadata]);

  const handlePay = useCallback(async () => {
    setErrorMessage(null);

    if (selectedMethod === 'card') {
      const validationError = validateCardForm();
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }
    }

    setIsProcessing(true);

    try {
      const request = buildPaymentRequest();
      const response = await paymentProviderClient.createTransaction(request);

      if (response.status === 'failed') {
        const message = response.error?.message ?? 'Payment failed. Please try again.';
        setErrorMessage(message);
        onError?.(new Error(message));
        return;
      }

      onSuccess?.(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('An unexpected error occurred.');
      setErrorMessage(err.message);
      onError?.(err);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedMethod,
    validateCardForm,
    buildPaymentRequest,
    paymentProviderClient,
    onSuccess,
    onError,
  ]);

  const handleCancel = useCallback(() => {
    if (isProcessing) return;
    onCancel?.();
  }, [isProcessing, onCancel]);

  const updateCardField = useCallback((field: keyof CardFormState, value: string) => {
    setCardForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const renderPaymentMethodSelector = () => (
    <View style={styles.methodSelector}>
      <TouchableOpacity
        style={[
          styles.methodButton,
          selectedMethod === 'card' && styles.methodButtonActive,
        ]}
        onPress={() => setSelectedMethod('card')}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedMethod === 'card' }}
      >
        <Text
          style={[
            styles.methodButtonText,
            selectedMethod === 'card' && styles.methodButtonTextActive,
          ]}
        >
          Card
        </Text>
      </TouchableOpacity>

      {isApplePayAvailable && (
        <TouchableOpacity
          style={[
            styles.methodButton,
            selectedMethod === 'apple_pay' && styles.methodButtonActive,
          ]}
          onPress={() => setSelectedMethod('apple_pay')}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'apple_pay' }}
        >
          <Text
            style={[
              styles.methodButtonText,
              selectedMethod === 'apple_pay' && styles.methodButtonTextActive,
            ]}
          >
             Pay
          </Text>
        </TouchableOpacity>
      )}

      {isGooglePayAvailable && (
        <TouchableOpacity
          style={[
            styles.methodButton,
            selectedMethod === 'google_pay' && styles.methodButtonActive,
          ]}
          onPress={() => setSelectedMethod('google_pay')}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'google_pay' }}
        >
          <Text
            style={[
              styles.methodButtonText,
              selectedMethod === 'google_pay' && styles.methodButtonTextActive,
            ]}
          >
            G Pay
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCardForm = () => {
    if (selectedMethod !== 'card') return null;

    return (
      <View style={styles.cardForm}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={styles.input}
          value={cardForm.number}
          onChangeText={(value) => updateCardField('number', value)}
          placeholder="1234 5678 9012 3456"
          keyboardType="number-pad"
          maxLength={23}
          editable={!isProcessing}
          accessibilityLabel="Card number"
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Exp. Month</Text>
            <TextInput
              style={styles.input}
              value={cardForm.expMonth}
              onChangeText={(value) => updateCardField('expMonth', value)}
              placeholder="MM"
              keyboardType="number-pad"
              maxLength={2}
              editable={!isProcessing}
              accessibilityLabel="Expiration month"
            />
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.label}>Exp. Year</Text>
            <TextInput
              style={styles.input}
              value={cardForm.expYear}
              onChangeText={(value) => updateCardField('expYear', value)}
              placeholder="YY"
              keyboardType="number-pad"
              maxLength={2}
              editable={!isProcessing}
              accessibilityLabel="Expiration year"
            />
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.label}>CVC</Text>
            <TextInput
              style={styles.input}
              value={cardForm.cvc}
              onChangeText={(value) => updateCardField('cvc', value)}
              placeholder="123"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              editable={!isProcessing}
              accessibilityLabel="CVC"
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Checkout</Text>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>{formattedAmount}</Text>
          </View>

          {renderPaymentMethodSelector()}
          {renderCardForm()}

          {errorMessage && (
            <View style={styles.errorContainer} accessibilityRole="alert">
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel={`Pay ${formattedAmount}`}
            accessibilityState={{ disabled: isProcessing, busy: isProcessing }}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>Pay {formattedAmount}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel="Cancel checkout"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
    textAlign: 'center',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  methodButtonActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  methodButtonTextActive: {
    color: '#4F46E5',
  },
  cardForm: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1A1A2E',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowItem: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CheckoutComponent;