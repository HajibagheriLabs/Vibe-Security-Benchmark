import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert } from 'react-native';
import { BiometricGate } from '../components/BiometricGate';
import { useBiometricAuth } from '../hooks/useBiometricAuth';

export const SensitiveScreen: React.FC = () => {
  const { authenticate, checkAvailability } = useBiometricAuth();

  const handleReauthenticate = async () => {
    const success = await authenticate('Re-authenticate to view sensitive data');
    if (success) {
      Alert.alert('Success', 'Re-authentication successful');
    }
  };

  const handleCheckAvailability = async () => {
    await checkAvailability();
    Alert.alert('Biometric Status', 'Availability checked - check console for details');
  };

  return (
    <BiometricGate
      authenticateReason="Access your sensitive financial data"
      onAuthSuccess={() => console.log('Sensitive screen accessed')}
      onAuthFailure={(error) => console.warn('Auth failed:', error)}
      maxAttempts={3}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔒 Sensitive Data Screen</Text>
          <Text style={styles.subtitle}>Biometrically protected content</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Balance</Text>
          <Text style={styles.balance}>$124,587.42</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>API Keys</Text>
          <Text style={styles.monospace}>sk_live_••••••••••••••••••••••••</Text>
          <Text style={styles.monospace}>pk_live_••••••••••••••••••••••••</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recovery Codes</Text>
          <Text style={styles.monospace}>A1B2-C3D4-E5F6</Text>
          <Text style={styles.monospace}>G7H8-I9J0-K1L2</Text>
          <Text style={styles.monospace}>M3N4-O5P6-Q7R8</Text>
        </View>

        <View style={styles.actions}>
          <Button title="Re-authenticate" onPress={handleReauthenticate} />
          <Button title="Check Biometric Status" onPress={handleCheckAvailability} color="#666" />
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            This screen is protected by biometric authentication. 
            Close and reopen the app to trigger authentication again.
          </Text>
        </View>
      </ScrollView>
    </BiometricGate>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  info: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#e8f0fe',
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#1a73e8',
    textAlign: 'center',
    lineHeight: 20,
  },
});