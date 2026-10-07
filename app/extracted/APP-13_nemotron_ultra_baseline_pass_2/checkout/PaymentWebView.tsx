import React, { useEffect, useRef } from 'react';
import { View, WebView, ActivityIndicator, StyleSheet, Platform, BackHandler } from 'react-native';
import { useCheckout } from './CheckoutContext';

interface PaymentWebViewProps {
  onPaymentComplete?: (success: boolean) => void;
}

export const PaymentWebView: React.FC<PaymentWebViewProps> = ({ onPaymentComplete }) => {
  const { transaction, isWebViewVisible, closeWebView, reset } = useCheckout();
  const webViewRef = useRef<WebView>(null);
  const hasHandledResult = useRef(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isWebViewVisible && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [isWebViewVisible]);

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYMENT_RESULT') {
        if (!hasHandledResult.current) {
          hasHandledResult.current = true;
          const success = data.status === 'completed';
          onPaymentComplete?.(success);
          if (success) {
            reset();
          } else {
            closeWebView();
          }
        }
      } else if (data.type === 'CLOSE_WEBVIEW') {
        closeWebView();
      }
    } catch {
      // Ignore non-JSON messages
    }
  };

  const onNavigationStateChange = (navState: { url?: string; canGoBack: boolean }) => {
    if (transaction && navState.url) {
      const url = new URL(navState.url);
      if (url.searchParams.has('payment_result')) {
        const result = url.searchParams.get('payment_result');
        if (result === 'success' || result === 'failed' || result === 'cancelled') {
          if (!hasHandledResult.current) {
            hasHandledResult.current = true;
            const success = result === 'success';
            onPaymentComplete?.(success);
            if (success) {
              reset();
            } else {
              closeWebView();
            }
          }
        }
      }
    }
  };

  if (!isWebViewVisible || !transaction) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: transaction.paymentUrl }}
        style={styles.webView}
        onMessage={onMessage}
        onNavigationStateChange={onNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        originWhitelist={['*']}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
        onLoadStart={() => {
          hasHandledResult.current = false;
        }}
        onError={(error) => {
          console.error('WebView error:', error);
          closeWebView();
          onPaymentComplete?.(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});