import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBiometricGate, BiometricGateStatus } from '../hooks/useBiometricGate';

interface BiometricGateProps {
  children: React.ReactNode;
  promptMessage?: string;
  autoAuthenticate?: boolean;
  authenticateOnForeground?: boolean;
  lockedComponent?: React.ReactNode;
  unavailableComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  checkingComponent?: React.ReactNode;
}

const DEFAULT_LOCKED_COMPONENT = (
  <View style={styles.centerContainer}>
    <Text style={styles.lockIcon}>🔒</Text>
    <Text style={styles.title}>Sensitive Content</Text>
    <Text style={styles.subtitle}>This screen requires biometric authentication.</Text>
  </View>
);

const DEFAULT_UNAVAILABLE_COMPONENT = (
  <View style={styles.centerContainer}>
    <Text style={styles.lockIcon}>⚠️</Text>
    <Text style={styles.title}>Biometrics Unavailable</Text>
    <Text style={styles.subtitle}>
      Please set up biometric authentication in your device settings to access this screen.
    </Text>
  </View>
);

const DEFAULT_CHECKING_COMPONENT = (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.checkingText}>Checking biometric authentication...</Text>
  </View>
);

export function BiometricGate({
  children,
  promptMessage = 'Authenticate to access sensitive content',
  autoAuthenticate = true,
  authenticateOnForeground = true,
  lockedComponent,
  unavailableComponent,
  errorComponent,
  checkingComponent,
}: BiometricGateProps) {
  const { status, availability, error, authenticate, reset } = useBiometricGate({
    autoAuthenticate,
    authenticateOnForeground,
    promptMessage,
  });

  const handleAuthenticatePress = useCallback(() => {
    void authenticate();
  }, [authenticate]);

  const handleRetryPress = useCallback(() => {
    reset();
  }, [reset]);

  const renderDefaultLocked = () => (
    <View style={styles.centerContainer}>
      {DEFAULT_LOCKED_COMPONENT}
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handleAuthenticatePress}
        accessibilityRole="button"
        accessibilityLabel="Authenticate with biometrics"
      >
        <Text style={styles.buttonText}>
          {availability?.biometryType === 'facial'
            ? 'Authenticate with Face ID'
            : availability?.biometryType === 'fingerprint'
              ? 'Authenticate with Fingerprint'
              : 'Authenticate'}
        </Text>
      </Pressable>
    </View>
  );

  const renderDefaultError = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.lockIcon}>❌</Text>
      <Text style={styles.title}>Authentication Failed</Text>
      <Text style={styles.errorText}>{error}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handleRetryPress}
        accessibilityRole="button"
        accessibilityLabel="Retry authentication"
      >
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  switch (status) {
    case 'checking':
      return <>{checkingComponent ?? DEFAULT_CHECKING_COMPONENT}</>;

    case 'unlocked':
      return <>{children}</>;

    case 'unavailable':
      return <>{unavailableComponent ?? DEFAULT_UNAVAILABLE_COMPONENT}</>;

    case 'error':
      return <>{errorComponent ?? renderDefaultError()}</>;

    case 'locked':
    default:
      return <>{lockedComponent ?? renderDefaultLocked()}</>;
  }
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  checkingText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});