// BiometricAuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import BiometricAuth from 'react-native-biometrics';

interface BiometricAuthContextType {
  isAuthenticated: boolean;
  isChecking: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const BiometricAuthContext = createContext<BiometricAuthContextType | undefined>(undefined);

export const useBiometricAuth = () => {
  const context = useContext(BiometricAuthContext);
  if (!context) {
    throw new Error('useBiometricAuth must be used within a BiometricAuthProvider');
  }
  return context;
};

export const BiometricAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Simulate checking local storage or secure store for existing session
    // In a real app, you might check if a token exists and is valid
    setTimeout(() => {
      setIsChecking(false);
    }, 1000);
  }, []);

  const login = async () => {
    const biometrics = new BiometricAuth();
    const { available, type } = await biometrics.isSensorAvailable();

    if (!available) {
      Alert.alert('Biometrics Not Available', 'Biometric authentication is not available on this device.');
      // Fallback to PIN or password in a real app
      setIsAuthenticated(true);
      return;
    }

    try {
      const result = await biometrics.simplePrompt({
        promptMessage: 'Authenticate',
      });

      if (result.success) {
        setIsAuthenticated(true);
      } else {
        Alert.alert('Authentication Failed', 'Biometric authentication failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during authentication.');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <BiometricAuthContext.Provider value={{ isAuthenticated, isChecking, login, logout }}>
      {children}
    </BiometricAuthContext.Provider>
  );
};