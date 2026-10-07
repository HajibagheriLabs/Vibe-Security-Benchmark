import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { authenticateWithBiometrics, verifyBiometricAccess, enableBiometricAccess, disableBiometricAccess, checkBiometricAvailability, BiometricAvailability } from './biometric-auth';
import { clearAllBiometricData } from './secure-store';

interface SecureScreenProps {
  onAuthSuccess: (credential: string) => void;
  onAuthCancel: () => void;
}

export const SecureScreen: React.FC<SecureScreenProps> = ({ onAuthSuccess, onAuthCancel }) => {
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = useCallback(async () => {
    const result = await checkBiometricAvailability();
    setAvailability(result);
    const enabled = await import('./secure-store').then(m => m.isBiometricEnabled());
    setBiometricEnabled(enabled);
  }, []);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleAuthenticate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyBiometricAccess();
      if (result.success && result.credential) {
        onAuthSuccess(result.credential);
      } else {
        setError(result.error || 'Authentication failed');
        if (result.error?.includes('fallback') || result.error?.includes('cancel')) {
          onAuthCancel();
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableBiometrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const credential = 'sensitive-session-token-' + Date.now();
      const result = await enableBiometricAccess(credential);
      if (result.success) {
        setBiometricEnabled(true);
        Alert.alert('Success', 'Biometric access enabled');
      } else {
        setError(result.error || 'Failed to enable biometrics');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableBiometrics = async () => {
    await disableBiometricAccess();
    setBiometricEnabled(false);
    Alert.alert('Success', 'Biometric access disabled');
  };

  if (!availability) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Checking biometric availability...</Text>
      </View>
    );
  }

  if (!availability.available) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Biometric authentication not available</Text>
        <Text style={styles.text}>{availability.error}</Text>
        <Button title="Go Back" onPress={onAuthCancel} />
      </View>
    );
  }

  const biometryLabel = availability.biometryType === 'FacialRecognition' ? 'Face ID' : 'Touch ID';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Area</Text>
      <Text style={styles.text}>
        This screen requires {biometryLabel} authentication.
      </Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {biometricEnabled ? (
        <>
          <Button
            title={`Authenticate with ${biometryLabel}`}
            onPress={handleAuthenticate}
            disabled={isLoading}
          />
          <Button
            title="Disable Biometric Access"
            onPress={handleDisableBiometrics}
            color="#dc3545"
            disabled={isLoading}
          />
        </>
      ) : (
        <Button
          title={`Enable ${biometryLabel} Access`}
          onPress={handleEnableBiometrics}
          disabled={isLoading}
        />
      )

      <Button title="Cancel" onPress={onAuthCancel} color="#6c757d" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
});