import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BiometricAuthService } from '../security/biometricAuth';

interface BiometricGateProps {
  children: React.ReactNode;
  onAuthenticationSuccess?: () => void;
  onAuthenticationFailure?: (error: string) => void;
}

/**
 * BiometricGate component
 * Security decisions:
 * - Gates access to sensitive content behind biometric authentication
 * - No bypass mechanism or fallback to less secure authentication
 * - Explicit user action required to trigger authentication
 */
export const BiometricGate: React.FC<BiometricGateProps> = ({
  children,
  onAuthenticationSuccess,
  onAuthenticationFailure,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await BiometricAuthService.isBiometricAvailable();
    setIsAvailable(available);
    
    if (available) {
      const type = await BiometricAuthService.getBiometricType();
      setBiometricType(type);
    }
  };

  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const result = await BiometricAuthService.authenticate();
      
      if (result.success) {
        setIsAuthenticated(true);
        onAuthenticationSuccess?.();
      } else {
        setError(result.error || 'Authentication failed');
        onAuthenticationFailure?.(result.error || 'Authentication failed');
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred during authentication';
      setError(errorMessage);
      onAuthenticationFailure?.(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, onAuthenticationSuccess, onAuthenticationFailure]);

  const handleSetupBiometric = useCallback(async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const result = await BiometricAuthService.setupBiometricProtection();
      
      if (result.success) {
        Alert.alert(
          'Biometric Setup Complete',
          'Biometric authentication has been enabled for sensitive content.',
          [{ text: 'OK' }]
        );
        setBiometricType(result.biometricType || null);
      } else {
        setError(result.error || 'Failed to setup biometric authentication');
      }
    } catch (err) {
      setError('An unexpected error occurred during setup');
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating]);

  // Loading state while checking availability
  if (isAvailable === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking security settings...</Text>
      </View>
    );
  }

  // Biometric not available
  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>
        <Text style={styles.title}>Biometric Authentication Required</Text>
        <Text style={styles.message}>
          This device does not support biometric authentication or it has not been configured.
          Please enable biometric authentication in your device settings to access this content.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={checkBiometricAvailability}
        >
          <Text style={styles.buttonText}>Check Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Authenticated - show children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Authentication required
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>
          {biometricType === 'FaceID' ? '👤' : biometricType === 'TouchID' ? '👆' : '🔐'}
        </Text>
      </View>
      
      <Text style={styles.title}>Authentication Required</Text>
      <Text style={styles.message}>
        {biometricType 
          ? `Use ${biometricType} to verify your identity and access sensitive content.`
          : 'Use biometric authentication to verify your identity.'}
      </Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.button, isAuthenticating && styles.buttonDisabled]}
        onPress={handleAuthenticate}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Authenticate with {biometricType || 'Biometrics'}
          </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.setupLink}
        onPress={handleSetupBiometric}
        disabled={isAuthenticating}
      >
        <Text style={styles.setupLinkText}>Re-setup biometric authentication</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  setupLink: {
    paddingVertical: 8,
  },
  setupLinkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});