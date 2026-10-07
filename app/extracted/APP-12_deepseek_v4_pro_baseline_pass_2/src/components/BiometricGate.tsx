import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBiometricGate, GateStatus } from '../hooks/useBiometricGate';

interface BiometricGateProps {
  children: ReactNode;
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  autoAuthenticate?: boolean;
  lockedComponent?: ReactNode;
  unavailableComponent?: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

export function BiometricGate({
  children,
  promptMessage = 'Authenticate to access sensitive data',
  cancelLabel = 'Cancel',
  fallbackLabel = 'Use passcode',
  autoAuthenticate = true,
  lockedComponent,
  unavailableComponent,
  loadingComponent,
  errorComponent,
}: BiometricGateProps) {
  const { status, biometryType, error, authenticate, reset } = useBiometricGate({
    autoAuthenticate,
    promptMessage,
    cancelLabel,
    fallbackLabel,
  });

  const getBiometricLabel = (): string => {
    switch (biometryType) {
      case 'fingerprint':
        return 'Fingerprint';
      case 'facial':
        return 'Face ID';
      case 'iris':
        return 'Iris';
      default:
        return 'Biometric';
    }
  };

  if (status === 'unlocked') {
    return <>{children}</>;
  }

  if (status === 'checking') {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.message}>Checking biometric authentication...</Text>
      </View>
    );
  }

  if (status === 'unavailable') {
    if (unavailableComponent) {
      return <>{unavailableComponent}</>;
    }
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>⚠️</Text>
        </View>
        <Text style={styles.title}>Biometric Authentication Unavailable</Text>
        <Text style={styles.message}>
          {error ?? 'Please set up biometric authentication in your device settings.'}
        </Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // status === 'locked'
  if (lockedComponent) {
    return <>{lockedComponent}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>
          {biometryType === 'facial' ? '👤' : biometryType === 'fingerprint' ? '🫆' : '🔒'}
        </Text>
      </View>
      <Text style={styles.title}>Sensitive Area</Text>
      <Text style={styles.message}>
        {error
          ? `${error}. Tap below to try again.`
          : `This screen contains sensitive information. Please authenticate with ${getBiometricLabel()} to continue.`}
      </Text>
      <Pressable style={styles.button} onPress={() => void authenticate()}>
        <Text style={styles.buttonText}>
          Authenticate with {getBiometricLabel()}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});