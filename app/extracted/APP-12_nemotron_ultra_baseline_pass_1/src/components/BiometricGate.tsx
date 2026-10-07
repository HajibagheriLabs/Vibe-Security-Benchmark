import React, { useState, useEffect, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useBiometricAuth, BiometricAuthState } from '../hooks/useBiometricAuth';

interface BiometricGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  authenticateReason?: string;
  onAuthSuccess?: () => void;
  onAuthFailure?: (error: string) => void;
  requireAuthOnMount?: boolean;
  maxAttempts?: number;
}

interface BiometricGateState {
  isAuthenticated: boolean;
  showFallback: boolean;
  attemptCount: number;
}

export const BiometricGate: React.FC<BiometricGateProps> = ({
  children,
  fallback = null,
  authenticateReason = 'Authenticate to access this screen',
  onAuthSuccess,
  onAuthFailure,
  requireAuthOnMount = true,
  maxAttempts = 3,
}) => {
  const { authenticate, isAvailable, isEnrolled, isAuthenticating, error, resetError } = useBiometricAuth();
  const [gateState, setGateState] = useState<BiometricGateState>({
    isAuthenticated: false,
    showFallback: false,
    attemptCount: 0,
  });

  const attemptAuth = async () => {
    if (gateState.attemptCount >= maxAttempts) {
      setGateState(prev => ({ ...prev, showFallback: true }));
      return;
    }

    const success = await authenticate(authenticateReason);
    
    if (success) {
      setGateState(prev => ({ ...prev, isAuthenticated: true }));
      onAuthSuccess?.();
    } else {
      setGateState(prev => ({ ...prev, attemptCount: prev.attemptCount + 1 }));
      onAuthFailure?.(error || 'Authentication failed');
    }
  };

  useEffect(() => {
    if (requireAuthOnMount && !gateState.isAuthenticated && !gateState.showFallback) {
      attemptAuth();
    }
  }, [requireAuthOnMount, gateState.isAuthenticated, gateState.showFallback]);

  useEffect(() => {
    if (error) {
      resetError();
    }
  }, [error, resetError]);

  if (gateState.showFallback) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>
          Maximum authentication attempts reached. Please use alternative authentication.
        </Text>
        {fallback}
      </View>
    );
  }

  if (!gateState.isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        {isAuthenticating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Authenticating...</Text>
          </View>
        )}
        {!isAuthenticating && !isAvailable && (
          <Text style={styles.unavailableText}>
            Biometric authentication is not available on this device.
          </Text>
        )}
        {!isAuthenticating && isAvailable && !isEnrolled && (
          <Text style={styles.unavailableText}>
            No biometric credentials enrolled. Please set up biometrics in device settings.
          </Text>
        )}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
  },
  unavailableText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  fallbackText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
});