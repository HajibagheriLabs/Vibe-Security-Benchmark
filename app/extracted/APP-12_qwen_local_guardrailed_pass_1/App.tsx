import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BiometricGate } from './BiometricGate';
import { SecureScreen } from './SecureScreen';
import { LoginScreen } from './LoginScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleBiometricSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleFallbackLogin = () => {
    // Navigate to login screen or handle logic there
    setIsAuthenticated(false);
  };

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Gate">
        <Stack.Screen 
          name="Gate" 
          options={{ headerShown: false }}
        >
          {() => (
            <BiometricGate 
              onAuthenticated={handleBiometricSuccess} 
              onFallbackLogin={handleFallbackLogin}
            />
          )}
        </Stack.Screen>
        <Stack.Screen 
          name="SecureScreen" 
          component={SecureScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}