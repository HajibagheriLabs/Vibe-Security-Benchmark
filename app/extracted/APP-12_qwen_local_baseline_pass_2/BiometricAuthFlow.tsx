import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {
  authenticate,
  BiometricType,
} from 'react-native-biometrics';

// Mock sensitive screen content
const SensitiveDataScreen = () => (
  <View style={styles.contentContainer}>
    <Text style={styles.title}>🔒 Sensitive Data</Text>
    <Text style={styles.subtitle}>
      This screen is gated by biometric authentication.
    </Text>
    <Text style={styles.dataText}>
      SSN: 123-45-6789
    </Text>
    <Text style={styles.dataText}>
      Balance: $10,000.00
    </Text>
  </View>
);

const BiometricAuthFlow = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<BiometricType | null>(null);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const { type } = await authenticate({
        promptMessage: 'Configure Biometrics',
      });
      
      if (type !== BiometricType.None) {
        setBiometricType(type);
      } else {
        // No biometrics available, allow access or show fallback
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Biometric check failed:', error);
      // Fallback to pass if biometrics fail to initialize
      setIsAuthenticated(true);
    }
  };

  const handleAuthenticate = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await authenticate({
        promptMessage: 'Authenticate to view data',
        fallbackMessage: 'Enter PIN instead',
        cancelButton: 'Cancel',
      });

      if (result.success) {
        setIsAuthenticated(true);
      } else {
        // Handle failure (e.g., show PIN entry or retry)
        Alert.alert('Authentication Failed', 'Please try again or use fallback.');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Biometric authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // If biometrics are not supported, we might skip directly or show a button
  if (!biometricType && !isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Biometrics not supported on this device.</Text>
        <TouchableOpacity style={styles.button} onPress={() => setIsAuthenticated(true)}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If already authenticated, show the sensitive screen
  if (isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <SensitiveDataScreen />
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Lock Screen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Authenticated screen, showing auth prompt
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.authContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>Biometric Authentication</Text>
        <Text style={styles.subtitle}>
          Please use your fingerprint or face ID to access the sensitive data.
        </Text>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleAuthenticate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Authenticate</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    width: '85%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  dataText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginVertical: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#5A5A5A',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginBottom: 20,
  },
});

export default BiometricAuthFlow;