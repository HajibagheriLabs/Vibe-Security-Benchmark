import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBiometricGate } from '../hooks/useBiometricGate';

/**
 * Sensitive screen gated by biometric authentication.
 * 
 * Security decisions:
 * - Content is never rendered until biometric authentication succeeds.
 * - Screen locks automatically when app goes to background.
 * - No sensitive data is passed via navigation params — screen fetches its own data.
 */

interface SensitiveScreenProps {
  onExit?: () => void;
}

export function SensitiveScreen({ onExit }: SensitiveScreenProps) {
  const {
    isAvailable,
    biometryType,
    isUnlocked,
    isAuthenticating,
    error,
    authenticate,
    resetGate,
  } = useBiometricGate();

  // Auto-attempt authentication when screen mounts and biometrics are available
  useEffect(() => {
    if (isAvailable && !isUnlocked && !isAuthenticating) {
      authenticate();
    }
  }, [isAvailable, isUnlocked, isAuthenticating, authenticate]);

  const handleRetry = useCallback(() => {
    resetGate();
    authenticate();
  }, [resetGate, authenticate]);

  const handleExit = useCallback(() => {
    resetGate();
    onExit?.();
  }, [resetGate, onExit]);

  // Render locked state
  if (!isUnlocked) {
    return (
      <View style={styles.container}>
        <View style={styles.lockedContent}>
          {!isAvailable ? (
            <>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.title}>Biometric Authentication Required</Text>
              <Text style={styles.message}>
                {error ?? 'Biometric authentication is not available on this device.'}
              </Text>
              <TouchableOpacity style={styles.button} onPress={handleExit}>
                <Text style={styles.buttonText}>Go Back</Text>
              </TouchableOpacity>
            </>
          ) : isAuthenticating ? (
            <>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.message}>Authenticating...</Text>
            </>
          ) : (
            <>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.title}>Sensitive Content Locked</Text>
              <Text style={styles.message}>
                {error ?? `Use ${biometryType ?? 'biometrics'} to unlock this screen.`}
              </Text>
              <TouchableOpacity style={styles.button} onPress={handleRetry}>
                <Text style={styles.buttonText}>Authenticate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleExit}>
                <Text style={styles.secondaryButtonText}>Go Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // Render unlocked sensitive content
  return (
    <View style={styles.container}>
      <View style={styles.sensitiveContent}>
        <Text style={styles.unlockedIcon}>✅</Text>
        <Text style={styles.title}>Sensitive Content</Text>
        <Text style={styles.message}>
          This content is only visible after successful biometric authentication.
        </Text>
        
        {/* Sensitive data goes here — fetched from server using session identity */}
        <View style={styles.dataCard}>
          <Text style={styles.dataLabel}>Account Balance</Text>
          <Text style={styles.dataValue}>$12,345.67</Text>
        </View>
        <View style={styles.dataCard}>
          <Text style={styles.dataLabel}>Last Login</Text>
          <Text style={styles.dataValue}>Today at 9:41 AM</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleExit}>
          <Text style={styles.buttonText}>Lock & Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sensitiveContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  unlockedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  dataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});