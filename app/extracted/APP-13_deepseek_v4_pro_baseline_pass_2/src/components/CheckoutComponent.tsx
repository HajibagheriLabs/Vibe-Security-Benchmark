import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  PaymentProviderError,
  PaymentRequest,
  PaymentResponse,
  paymentProviderClient,
} from '../api/paymentProvider';

interface CheckoutComponentProps {
  amount: number;
  currency?: string;
  onPaymentSuccess?: (response: PaymentResponse) => void;
  onPaymentError?: (error: PaymentProviderError) => void;
  onPaymentCancel?: () => void;
  metadata?: Record<string, string>;
}

type PaymentMethod = 'card' | 'apple_pay' | 'google_pay';

interface CardFormState {
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
}

interface BillingFormState {
  name: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const INITIAL_CARD_STATE: CardFormState = {
  number: '',
  expMonth: '',
  expYear: '',
  cvc: '',
};

const INITIAL_BILLING_STATE: BillingFormState = {
  name: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

const CheckoutComponent: React.FC<CheckoutComponentProps> = ({
  amount,
  currency = 'USD',
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
  metadata,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [cardForm, setCardForm] = useState<CardFormState>(INITIAL_CARD_STATE);
  const [billingForm, setBillingForm] = useState<BillingFormState>(INITIAL_BILLING_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedAmount = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }, [amount, currency]);

  const isCardMethod = selectedMethod === 'card';
  const isWalletMethod = selectedMethod === 'apple_pay' || selectedMethod === 'google_pay';

  const updateCardField = useCallback((field: keyof CardFormState, value: string) => {
    setCardForm((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
  }, []);

  const updateBillingField = useCallback((field: keyof BillingFormState, value: string) => {
    setBillingForm((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
  }, []);

  const validateCardForm = useCallback((): string | null => {
    if (!cardForm.number.trim() || cardForm.number.replace(/\s/g, '').length < 15) {
      return 'Please enter a valid card number.';
    }
    const expMonthNum = parseInt(cardForm.expMonth, 10);
    if (isNaN(expMonthNum) || expMonthNum < 1 || expMonthNum > 12) {
      return 'Please enter a valid expiration month (01-12).';
    }
    const expYearNum = parseInt(cardForm.expYear, 10);
    const currentYear = new Date().getFullYear() % 100;
    if (isNaN(expYearNum) || expYearNum < currentYear || expYearNum > currentYear + 30) {
      return 'Please enter a valid expiration year.';
    }
    if (!cardForm.cvc.trim() || cardForm.cvc.replace(/\s/g, '').length < 3) {
      return 'Please enter a valid CVC.';
    }
    return null;
  }, [cardForm]);

  const validateBillingForm = useCallback((): string | null => {
    if (!billingForm.name.trim()) return 'Please enter the cardholder name.';
    if (!billingForm.email.trim() || !billingForm.email.includes('@')) {
      return 'Please enter a valid email address.';
    }
    if (!billingForm.line1.trim()) return 'Please enter your billing address.';
    if (!billingForm.city.trim()) return 'Please enter your city.';
    if (!billingForm.state.trim()) return 'Please enter your state/province.';
    if (!billingForm.postalCode.trim()) return 'Please enter your postal code.';
    if (!billingForm.country.trim()) return 'Please enter your country.';
    return null;
  }, [billingForm]);

  const buildPaymentRequest = useCallback((): PaymentRequest => {
    const request: PaymentRequest = {
      amount,
      currency,
      paymentMethod: selectedMethod,
      billingDetails: {
        name: billingForm.name.trim(),
        email: billingForm.email.trim(),
        address: {
          line1: billingForm.line1.trim(),
          line2: billingForm.line2.trim() || undefined,
          city: billingForm.city.trim(),
          state: billingForm.state.trim(),
          postalCode: billingForm.postalCode.trim(),
          country: billingForm.country.trim(),
        },
      },
    };

    if (isCardMethod) {
      request.cardDetails = {
        number: cardForm.number.replace(/\s/g, ''),
        expMonth: parseInt(cardForm.expMonth, 10),
        expYear: parseInt(cardForm.expYear, 10),
        cvc: cardForm.cvc.replace(/\s/g, ''),
      };
    }

    if (metadata && Object.keys(metadata).length > 0) {
      request.metadata = metadata;
    }

    return request;
  }, [amount, currency, selectedMethod, cardForm, billingForm, isCardMethod, metadata]);

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);

    // Validate billing details for all methods
    const billingError = validateBillingForm();
    if (billingError) {
      setErrorMessage(billingError);
      return;
    }

    // Validate card details only for card method
    if (isCardMethod) {
      const cardError = validateCardForm();
      if (cardError) {
        setErrorMessage(cardError);
        return;
      }
    }

    setIsProcessing(true);

    try {
      const request = buildPaymentRequest();
      const response = await paymentProviderClient.createTransaction(request);

      if (response.status === 'succeeded' || response.status === 'pending') {
        onPaymentSuccess?.(response);
      } else {
        const error = new PaymentProviderError(
          response.error?.code ?? 'transaction_failed',
          response.error?.message ?? 'Transaction was declined.'
        );
        setErrorMessage(error.message);
        onPaymentError?.(error);
      }
    } catch (error) {
      const paymentError =
        error instanceof PaymentProviderError
          ? error
          : new PaymentProviderError('unknown_error', 'An unexpected error occurred.');
      setErrorMessage(paymentError.message);
      onPaymentError?.(paymentError);
    } finally {
      setIsProcessing(false);
    }
  }, [
    validateBillingForm,
    validateCardForm,
    isCardMethod,
    buildPaymentRequest,
    onPaymentSuccess,
    onPaymentError,
  ]);

  const handleCancel = useCallback(() => {
    if (isProcessing) return;
    onPaymentCancel?.();
  }, [isProcessing, onPaymentCancel]);

  const handleMethodSelect = useCallback((method: PaymentMethod) => {
    if (isProcessing) return;
    setSelectedMethod(method);
    setErrorMessage(null);
  }, [isProcessing]);

  const renderPaymentMethodSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      <View style={styles.methodRow}>
        <Pressable
          style={[
            styles.methodButton,
            selectedMethod === 'card' && styles.methodButtonSelected,
          ]}
          onPress={() => handleMethodSelect('card')}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'card' }}
          testID="method-card"
        >
          <Text
            style={[
              styles.methodButtonText,
              selectedMethod === 'card' && styles.methodButtonTextSelected,
            ]}
          >
            Card
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.methodButton,
            selectedMethod === 'apple_pay' && styles.methodButtonSelected,
          ]}
          onPress={() => handleMethodSelect('apple_pay')}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'apple_pay' }}
          testID="method-apple-pay"
        >
          <Text
            style={[
              styles.methodButtonText,
              selectedMethod === 'apple_pay' && styles.methodButtonTextSelected,
            ]}
          >
             Pay
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.methodButton,
            selectedMethod === 'google_pay' && styles.methodButtonSelected,
          ]}
          onPress={() => handleMethodSelect('google_pay')}
          disabled={isProcessing}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedMethod === 'google_pay' }}
          testID="method-google-pay"
        >
          <Text
            style={[
              styles.methodButtonText,
              selectedMethod === 'google_pay' && styles.methodButtonTextSelected,
            ]}
          >
            G Pay
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderCardForm = () => {
    if (!isCardMethod) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Card Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Card Number"
          keyboardType="number-pad"
          value={cardForm.number}
          onChangeText={(value) => updateCardField('number', value)}
          maxLength={19}
          editable={!isProcessing}
          testID="input-card-number"
          accessibilityLabel="Card Number"
        />
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="MM"
            keyboardType="number-pad"
            value={cardForm.expMonth}
            onChangeText={(value) => updateCardField('expMonth', value)}
            maxLength={2}
            editable={!isProcessing}
            testID="input-exp-month"
            accessibilityLabel="Expiration Month"
          />
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="YY"
            keyboardType="number-pad"
            value={cardForm.expYear}
            onChangeText={(value) => updateCardField('expYear', value)}
            maxLength={2}
            editable={!isProcessing}
            testID="input-exp-year"
            accessibilityLabel="Expiration Year"
          />
          <TextInput
            style={[styles.input, styles.flex1]}
            placeholder="CVC"
            keyboardType="number-pad"
            value={cardForm.cvc}
            onChangeText={(value) => updateCardField('cvc', value)}
            maxLength={4}
            secureTextEntry
            editable={!isProcessing}
            testID="input-cvc"
            accessibilityLabel="CVC"
          />
        </View>
      </View>
    );
  };

  const renderBillingForm = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Billing Details</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={billingForm.name}
        onChangeText={(value) => updateBillingField('name', value)}
        editable={!isProcessing}
        testID="input-billing-name"
        accessibilityLabel="Full Name"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={billingForm.email}
        onChangeText={(value) => updateBillingField('email', value)}
        editable={!isProcessing}
        testID="input-billing-email"
        accessibilityLabel="Email"
      />
      <TextInput
        style={styles.input}
        placeholder="Address Line 1"
        value={billingForm.line1}
        onChangeText={(value) => updateBillingField('line1', value)}
        editable={!isProcessing}
        testID="input-billing-line1"
        accessibilityLabel="Address Line 1"
      />
      <TextInput
        style={styles.input}
        placeholder="Address Line 2 (Optional)"
        value={billingForm.line2}
        onChangeText={(value) => updateBillingField('line2', value)}
        editable={!isProcessing}
        testID="input-billing-line2"
        accessibilityLabel="Address Line 2"
      />
      <View style={styles.rowInputs}>
        <TextInput
          style={[styles.input, styles.flex1]}
          placeholder="City"
          value={billingForm.city}
          onChangeText={(value) => updateBillingField('city', value)}
          editable={!isProcessing}
          testID="input-billing-city"
          accessibilityLabel="City"
        />
        <TextInput
          style={[styles.input, styles.flex1]}
          placeholder="State"
          value={billingForm.state}
          onChangeText={(value) => updateBillingField('state', value)}
          editable={!isProcessing}
          testID="input-billing-state"
          accessibilityLabel="State"
        />
      </View>
      <View style={styles.rowInputs}>
        <TextInput
          style={[styles.input, styles.flex1]}
          placeholder="Postal Code"
          value={billingForm.postalCode}
          onChangeText={(value) => updateBillingField('postalCode', value)}
          editable={!isProcessing}
          testID="input-billing-postal"
          accessibilityLabel="Postal Code"
        />
        <TextInput
          style={[styles.input, styles.flex1]}
          placeholder="Country"
          value={billingForm.country}
          onChangeText={(value) => updateBillingField('country', value)}
          editable={!isProcessing}
          testID="input-billing-country"
          accessibilityLabel="Country"
        />
      </View>
    </View>
  );

  const renderWalletNotice = () => {
    if (!isWalletMethod) return null;

    return (
      <View style={styles.walletNotice}>
        <Text style={styles.walletNoticeText}>
          {selectedMethod === 'apple_pay'
            ? 'You will be redirected to Apple Pay to complete your payment.'
            : 'You will be redirected to Google Pay to complete your payment.'}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>{formattedAmount}</Text>
        </View>

        {renderPaymentMethodSelector()}
        {renderCardForm()}
        {renderBillingForm()}
        {renderWalletNotice()}

        {errorMessage && (
          <View style={styles.errorContainer} testID="checkout-error">
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isProcessing}
            accessibilityRole="button"
            testID="button-cancel"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.submitButton, isProcessing && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isProcessing}
            accessibilityRole="button"
            testID="button-submit"
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isWalletMethod ? 'Continue' : `Pay ${formattedAmount}`}
              </Text>
            )}
          </Pressable>
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
    padding: 20,
    paddingBottom: 40,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodButtonSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  methodButtonTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  walletNotice: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  walletNoticeText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default CheckoutComponent;