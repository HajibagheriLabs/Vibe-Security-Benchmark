import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Button, Alert } from 'react-native';
import { CheckoutProvider, CheckoutButton, PaymentWebView, CheckoutStatus, PaymentProviderConfig } from '../index';

const config: PaymentProviderConfig = {
  apiKey: 'sk_test_your_api_key_here',
  environment: 'sandbox',
  merchantId: 'merchant_12345',
};

const App: React.FC = () => {
  const handleSuccess = () => {
    Alert.alert('Success', 'Payment completed successfully!');
  };

  const handleError = (error: Error) => {
    Alert.alert('Error', error.message);
  };

  return (
    <CheckoutProvider config={config}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.title}>Checkout Demo</Text>
            <Text style={styles.subtitle}>Tap the button below to start a test payment</Text>
          </View>

          <View style={styles.section}>
            <CheckoutButton
              amount={2999}
              currency="USD"
              orderId={`order_${Date.now()}`}
              customerEmail="customer@example.com"
              customerName="John Doe"
              metadata={{ productId: 'prod_premium_plan' }}
              returnUrl="myapp://payment/success"
              cancelUrl="myapp://payment/cancel"
              onSuccess={handleSuccess}
              onError={handleError}
            >
              <Text style={styles.buttonText}>Pay $29.99</Text>
            </CheckoutButton>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <CheckoutStatus
              renderSuccess={(transaction) => (
                <View style={styles.successBox}>
                  <Text style={styles.successTitle}>✓ Payment Successful</Text>
                  <Text style={styles.successDetail}>Transaction: {transaction?.transactionId}</Text>
                  <Text style={styles.successDetail}>Amount: ${(transaction?.amount || 0) / 100}</Text>
                </View>
              )}
              renderError={(error) => (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>✗ Payment Failed</Text>
                  <Text style={styles.errorDetail}>{error?.message}</Text>
                  <Text style={styles.errorDetail}>Code: {error?.code}</Text>
                </View>
              )}
            />
          </View>

          <PaymentWebView onPaymentComplete={(success) => {
            if (success) {
              console.log('Payment completed via WebView callback');
            }
          }} />
        </ScrollView>
      </SafeAreaView>
    </CheckoutProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#D1FADF',
    borderRadius: 8,
    padding: 16,
  },
  successTitle: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  successDetail: {
    color: '#1C1C1E',
    fontSize: 14,
    marginBottom: 4,
  },
  errorBox: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 16,
  },
  errorTitle: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetail: {
    color: '#1C1C1E',
    fontSize: 14,
    marginBottom: 4,
  },
});

export default App;