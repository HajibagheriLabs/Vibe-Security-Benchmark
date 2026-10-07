// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { BiometricAuthProvider, useBiometricAuth } from './BiometricAuthContext';
import { AuthGate } from './AuthGate';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated } = useBiometricAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="AuthGate" component={AuthGate} />
      ) : (
        <Stack.Screen name="AuthGate" component={AuthGate} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <BiometricAuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </BiometricAuthProvider>
  );
}