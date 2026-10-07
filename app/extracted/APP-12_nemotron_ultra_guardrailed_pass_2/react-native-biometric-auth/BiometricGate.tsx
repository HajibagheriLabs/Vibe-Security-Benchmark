import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

interface BiometricGateProps {
  children: React.ReactNode;
  serviceName: string;
  fallbackLabel?: string;
  cancelLabel?: string;
}

export const BiometricGate: React.FC<BiometricGateProps> = ({
  children,
  serviceName,
  fallbackLabel = 'Use Passcode',
  cancelLabel = 'Cancel',
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const biometryType = await Keychain.getSupportedBiometryType();
        if (biometryType === Keychain.BiometryType.None) {
          setError('Biometric authentication not available on this device');
          setIsChecking(false);
          return;
        }
        const credentials = await Keychain.getGenericPassword({ service: serviceName });
        if (!credentials) {
          setError('No credentials found. Please log in first.');
          setIsChecking(false);
          return;
        }
        setIsChecking(false);
      } catch (e) {
        setError('Failed to check biometric availability');
        setIsChecking(false);
      }
    };
    checkBiometrics();
  }, [serviceName]);

  const authenticate = async () => {
    try {
      const result = await Keychain.getGenericPassword({
        service: serviceName,
        authenticationPrompt: {
          title: 'Biometric Authentication Required',
          subtitle: 'Authenticate to access sensitive data',
          description: 'Use your biometric credential to unlock',
          fallback: fallbackLabel,
          cancel: cancelLabel,
        },
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      });

      if (result) {
        setIsUnlocked(true);
        setError(null);
      } else {
        setError('Authentication cancelled or failed');
      }
    } catch (e: any) {
      if (e.code === 'UserCancel' || e.code === '-128') {
        setError('Authentication cancelled');
      } else if (e.code === 'UserFallback') {
        setError('Fallback to passcode selected');
      } else {
        setError(`Authentication failed: ${e.message}`);
      }
    }
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Checking biometric availability...</Text>
      </View>
    );
  }

  if (error && !isUnlocked) {
    return (
      <View style={styles.container}>
        <Text style={[styles.text, styles.error]}>{error}</Text>
        <Button title="Retry" onPress={authenticate} />
      </View>
    );
  }

  if (!isUnlocked) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Biometric authentication required</Text>
        <Button title="Authenticate" onPress={authenticate} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  error: {
    color: 'red',
  },
});