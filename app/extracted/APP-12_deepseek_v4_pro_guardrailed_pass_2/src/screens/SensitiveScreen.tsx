import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  AppState,
} from 'react-native';
import { BiometricGate } from '../components/BiometricGate';
import { BiometricAuthService } from '../security/biometricAuth';

/**
 * SensitiveScreen component
 * Security decisions:
 * - Entire screen content is gated behind biometric authentication
 * - Re-authentication required when app returns from background
 * - No sensitive data rendered until authentication succeeds
 */
export const SensitiveScreen: React.FC = () => {
  const [appState, setAppState] = React.useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - require re-authentication
        // This is handled by BiometricGate's internal state reset
        // Force component remount to reset authentication state
        setAppState(nextAppState);
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  const handleAuthenticationSuccess = () => {
    // Optional: Log successful authentication (without sensitive data)
    console.log('Biometric authentication successful');
  };

  const handleAuthenticationFailure = (error: string) => {
    // Optional: Handle authentication failure
    console.log('Biometric authentication failed:', error);
  };

  return (
    <BiometricGate
      key={appState} // Force remount on app state change to reset auth
      onAuthenticationSuccess={handleAuthenticationSuccess}
      onAuthenticationFailure={handleAuthenticationFailure}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sensitive Information</Text>
          <Text style={styles.subtitle}>
            This content is protected by biometric authentication
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Account Number:</Text>
            <Text style={styles.value}>•••• •••• •••• 1234</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Balance:</Text>
            <Text style={styles.value}>$12,345.67</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Last Transaction:</Text>
            <Text style={styles.value}>2024-01-15</Text>
          </View>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>John Doe</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>john.doe@example.com</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>+1 (555) 123-4567</Text>
          </View>
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityNoteText}>
            🔒 This screen automatically locks when the app goes to background.
            Biometric authentication is required to view this content again.
          </Text>
        </View>
      </ScrollView>
    </BiometricGate>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 14,
    color: '#666666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  securityNote: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
  securityNoteText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
});