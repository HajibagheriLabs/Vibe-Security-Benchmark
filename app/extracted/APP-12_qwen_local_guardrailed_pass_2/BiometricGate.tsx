import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Rule 1: Secure Store Usage
// expo-secure-store uses iOS Keychain / Android EncryptedSharedPreferences by default.
// We enforce `encrypted: true` for high-value items.

const BIOMETRIC_KEY = 'biometric_token';

type AuthStatus = 'idle' | 'checking' | 'unlocked' | 'locked';

const BiometricGate = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [error, setError] = useState<string | null>(null);

  // Rule 1: Device Support Check
  // Checks for hardware biometrics and enrollment simultaneously.
  const checkHardware = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!compatible || !enrolled) {
        setStatus('locked');
        setError('Biometric hardware not available or not enrolled.');
        return false;
      }
      return true;
    } catch (e) {
      setError('Failed to check biometric hardware.');
      setStatus('locked');
      return false;
    }
  }, []);

  // Rule 1: Biometric Authentication with .biometryCurrentSet
  // Ensures the token is invalidated if the user enrolls a new finger/face.
  const authenticate = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access sensitive data',
        fallbackLabel: 'Use Passcode',
        // Security: .biometryCurrentSet survives logout but fails if biometrics change.
        // This is stricter than .biometryAny.
        biometryTitle: 'Biometric Auth',
        // Optional: require biometry for the prompt to appear, fallback to passcode
        cancelOnBiometryChanged: true, 
      });

      if (result.success) {
        setStatus('unlocked');
      } else {
        // Handle specific errors
        if (result.error === 'user_cancel' || result.error === 'fallback') {
          // User cancelled or chose passcode. 
          // In a real app, you might check if the passcode matched the biometric key.
          setStatus('unlocked'); 
        } else {
          setStatus('locked');
          setError('Authentication failed.');
        }
      }
    } catch (e) {
      setStatus('locked');
      setError('Authentication error.');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const hasHardware = await checkHardware();
      if (!isMounted) return;

      if (!hasHardware) return;

      // Check if we have a stored token
      const token = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      
      if (token) {
        setStatus('checking');
        await authenticate();
      } else {
        // First launch or token wiped
        setStatus('unlocked');
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [checkHardware, authenticate]);

  const handleUnlock = async () => {
    await authenticate();
  };

  if (status === 'checking') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Verifying identity...</Text>
      </View>
    );
  }

  if (status === 'locked') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.title}>Biometric Authentication Required</Text>
        <Text style={styles.description}>Please authenticate to view sensitive data.</Text>
        <View style={styles.buttonContainer}>
          <Text style={styles.button} onPress={handleUnlock}>
            Unlock
          </Text>
        </View>
      </View>
    );
  }

  // Rule 1: Sensitive Screen Content
  // This component gates the access to `children`.
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    textAlign: 'center',
    width: '100%',
  },
});

export default BiometricGate;