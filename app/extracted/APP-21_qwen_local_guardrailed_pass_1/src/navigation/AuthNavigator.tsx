import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OAuthRedirectHandler } from '../services/auth/OAuthRedirectHandler';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export const AuthNavigator = () => {
  useEffect(() => {
    // Rule 4 (Deep Links): Subscribe to initial and future links.
    const handleInitialLink = async (url: string | null) => {
      if (!url) return;
      try {
        await OAuthRedirectHandler.handleRedirect(url);
        // Navigate to home after successful auth
        // Implementation depends on navigation context, typically a state update or direct navigation
      } catch (error) {
        console.error('Auth redirect failed:', error);
        // Navigate to login or show error
      }
    };

    Linking.getInitialURL().then(handleInitialLink);

    const subscription = Linking.addEventListener('url', (event) => {
      handleInitialLink(event.url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
};