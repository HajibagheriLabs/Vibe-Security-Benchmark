// SensitiveScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useBiometricAuth } from './BiometricAuthContext';

export const SensitiveScreen = () => {
  const { isAuthenticated, logout } = useBiometricAuth();

  if (!isAuthenticated) {
    return null; // Or redirect to login screen
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sensitive Data</Text>
      <Text style={styles.content}>
        This screen is gated by biometric authentication.
      </Text>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  content: {
    fontSize: 16,
    color: '#333',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});