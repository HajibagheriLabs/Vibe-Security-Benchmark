import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import BiometricGate from './BiometricGate';

// Rule 3: Binary Trust
// No secrets in this file. Sensitive data is rendered inside the gate.

const SensitiveScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Sensitive Data</Text>
      <Text style={styles.content}>
        This screen is protected by biometric authentication.
      </Text>
      <Text style={styles.content}>
        User ID: 12345
      </Text>
      <Text style={styles.content}>
        Balance: $1,000.00
      </Text>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <BiometricGate>
      <SensitiveScreen />
    </BiometricGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  content: {
    fontSize: 18,
    marginBottom: 10,
  },
});