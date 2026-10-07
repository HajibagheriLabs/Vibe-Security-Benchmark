import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { BiometricGate } from './BiometricGate';
import { SecureCredentialStore } from './SecureCredentialStore';

export const SensitiveScreen: React.FC = () => {
  const handleLogout = async () => {
    await SecureCredentialStore.clear();
    Alert.alert('Logged out', 'Credentials cleared. Please log in again.');
  };

  const handleSensitiveAction = () => {
    Alert.alert('Action Performed', 'Sensitive operation completed successfully');
  };

  return (
    <BiometricGate serviceName="com.app.sensitive_screen">
      <View style={styles.container}>
        <Text style={styles.title}>Sensitive Data Screen</Text>
        <Text style={styles.body}>
          This screen is protected by biometric authentication.
          Credentials are stored in hardware-backed keystore/secure enclave.
        </Text>
        <Button title="Perform Sensitive Action" onPress={handleSensitiveAction} />
        <Button title="Logout (Clear Credentials)" onPress={handleLogout} style={styles.dangerButton} />
      </View>
    </BiometricGate>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  dangerButton: {
    marginTop: 12,
  },
});