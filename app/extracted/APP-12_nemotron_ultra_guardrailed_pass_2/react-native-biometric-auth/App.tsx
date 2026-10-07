import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from './LoginScreen';
import { SensitiveScreen } from './SensitiveScreen';
import { SecureCredentialStore } from './SecureCredentialStore';

const Stack = createStackNavigator();

export const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkExistingCredentials = async () => {
    const hasCreds = await SecureCredentialStore.hasCredentials();
    setIsLoggedIn(hasCreds);
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Sensitive' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Sensitive" component={SensitiveScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};