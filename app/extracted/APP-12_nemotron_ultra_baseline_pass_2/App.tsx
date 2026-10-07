import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  BIOMETRIC_ENABLED: 'biometric_enabled',
  USER_AUTHENTICATED: 'user_authenticated',
} as const;

type AuthState = 'checking' | 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

interface BiometricAuthHook {
  authState: AuthState;
  errorMessage: string | null;
  isBiometricAvailable: boolean;
  biometricType: LocalAuthentication.AuthenticationType | null;
  authenticate: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  logout: () => void;
}

function useBiometricAuth(): BiometricAuthHook {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<LocalAuthentication.AuthenticationType | null>(null);

  const checkBiometricAvailability = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const available = hasHardware && isEnrolled;
      setIsBiometricAvailable(available);
      
      if (available && supportedTypes.length > 0) {
        setBiometricType(supportedTypes[0]);
      }
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      setIsBiometricAvailable(false);
    }
  }, []);

  const checkStoredAuthPreference = useCallback(async () => {
    try {
      const enabled = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      await checkBiometricAvailability();
      const biometricEnabled = await checkStoredAuthPreference();
      
      if (biometricEnabled) {
        setAuthState('unauthenticated');
      } else {
        setAuthState('authenticated');
      }
    };
    initialize();
  }, [checkBiometricAvailability, checkStoredAuthPreference]);

  const authenticate = useCallback(async () => {
    if (!isBiometricAvailable) {
      setErrorMessage('Biometric authentication not available on this device');
      setAuthState('error');
      return;
    }

    setAuthState('authenticating');
    setErrorMessage(null);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access sensitive data',
        cancelLabel: 'Cancel',
        fallbackLabel: Platform.OS === 'ios' ? 'Use Passcode' : 'Use PIN/Pattern',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_AUTHENTICATED, 'true');
        setAuthState('authenticated');
      } else {
        const errorMsg = result.error?.message || 'Authentication failed';
        setErrorMessage(errorMsg);
        setAuthState('error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Authentication error';
      setErrorMessage(errorMsg);
      setAuthState('error');
    }
  }, [isBiometricAvailable]);

  const enableBiometric = useCallback(async () => {
    if (!isBiometricAvailable) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device');
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication for this app',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
        setAuthState('authenticated');
        Alert.alert('Success', 'Biometric authentication enabled');
      } else {
        Alert.alert('Failed', 'Could not enable biometric authentication');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to enable biometric');
    }
  }, [isBiometricAvailable]);

  const disableBiometric = useCallback(async () => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_AUTHENTICATED);
      setAuthState('authenticated');
      Alert.alert('Disabled', 'Biometric authentication has been disabled');
    } catch (error) {
      Alert.alert('Error', 'Failed to disable biometric authentication');
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState('unauthenticated');
  }, []);

  return {
    authState,
    errorMessage,
    isBiometricAvailable,
    biometricType,
    authenticate,
    enableBiometric,
    disableBiometric,
    logout,
  };
}

function BiometricPrompt({ onAuthenticate, onEnable, isAvailable, biometricType }: {
  onAuthenticate: () => void;
  onEnable: () => void;
  isAvailable: boolean;
  biometricType: LocalAuthentication.AuthenticationType | null;
}) {
  const getBiometricLabel = () => {
    switch (biometricType) {
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Face ID';
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Fingerprint';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  };

  const label = getBiometricLabel();

  if (!isAvailable) {
    return (
      <View style={styles.promptContainer}>
        <Text style={styles.promptText}>Biometric authentication not available</Text>
        <Text style={styles.hintText}>
          {Platform.OS === 'ios' 
            ? 'Enable Face ID/Touch ID in Settings' 
            : 'Enable biometrics in Security settings'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.promptContainer}>
      <Text style={styles.promptText}>
        Tap to authenticate with {label}
      </Text>
      <Button
        title={`Authenticate with ${label}`}
        onPress={onAuthenticate}
        color="#007AFF"
      />
    </View>
  );
}

function SensitiveScreen({ onLogout, biometricEnabled, onDisableBiometric }: {
  onLogout: () => void;
  biometricEnabled: boolean;
  onDisableBiometric: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔒 Sensitive Data Screen</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Protected Information</Text>
        <Text style={styles.cardContent}>
          This screen contains sensitive data that requires biometric authentication.
        </Text>
        <Text style={styles.cardContent}>
          Access granted: {new Date().toLocaleTimeString()}
        </Text>
        <Text style={styles.cardContent}>
          Session ID: {Math.random().toString(36).substring(2, 15)}
        </Text>
      </View>
      <View style={styles.buttonGroup}>
        <Button
          title="Logout"
          onPress={onLogout}
          color="#FF3B30"
        />
        {biometricEnabled && (
          <Button
            title="Disable Biometric"
            onPress={onDisableBiometric}
            color="#FF9500"
          />
        )}
      </View>
    </View>
  );
}

function SetupScreen({ onEnable }: { onEnable: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Biometric Setup</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enable Biometric Authentication</Text>
        <Text style={styles.cardContent}>
          Secure this app with your device's biometric authentication (Face ID, Touch ID, or Fingerprint).
        </Text>
        <Text style={styles.cardContent}>
          You'll need to authenticate each time you access sensitive screens.
        </Text>
      </View>
      <Button
        title="Enable Biometric Authentication"
        onPress={onEnable}
        color="#34C759"
        style={styles.primaryButton}
      />
      <Text style={styles.hintText}>
        You can disable this later from the sensitive screen
      </Text>
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={[styles.container, styles.loadingContainer]}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Checking biometric availability...</Text>
    </View>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.errorTitle}>⚠️ Authentication Error</Text>
      <View style={styles.card}>
        <Text style={styles.errorText}>{message}</Text>
      </View>
      <Button title="Try Again" onPress={onRetry} color="#007AFF" />
    </View>
  );
}

export default function App() {
  const {
    authState,
    errorMessage,
    isBiometricAvailable,
    biometricType,
    authenticate,
    enableBiometric,
    disableBiometric,
    logout,
  } = useBiometricAuth();

  const biometricEnabled = authState !== 'checking' && authState !== 'unauthenticated';

  switch (authState) {
    case 'checking':
      return <LoadingScreen />;

    case 'unauthenticated':
      return (
        <BiometricPrompt
          onAuthenticate={authenticate}
          onEnable={enableBiometric}
          isAvailable={isBiometricAvailable}
          biometricType={biometricType}
        />
      );

    case 'authenticating':
      return <LoadingScreen />;

    case 'authenticated':
      return (
        <SensitiveScreen
          onLogout={logout}
          biometricEnabled={biometricEnabled}
          onDisableBiometric={disableBiometric}
        />
      );

    case 'error':
      return (
        <ErrorScreen
          message={errorMessage || 'Unknown error occurred'}
          onRetry={() => setAuthState('unauthenticated')}
        />
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  promptContainer: {
    alignItems: 'center',
    gap: 16,
  },
  promptText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#1C1C1E',
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#8E8E93',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  cardContent: {
    fontSize: 16,
    color: '#3A3A3C',
    lineHeight: 24,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#FF3B30',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#FF3B30',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    marginTop: 16,
  },
});