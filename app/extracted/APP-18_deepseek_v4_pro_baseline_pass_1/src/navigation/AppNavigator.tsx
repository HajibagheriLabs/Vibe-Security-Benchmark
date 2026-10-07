// src/navigation/AppNavigator.tsx
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  setNavigationRef,
  initializeDeepLinkHandling,
  subscribeToDeepLinks,
} from './deepLinkHandler';

type RootStackParamList = {
  Home: undefined;
  ResetPassword: { token: string };
  NotFound: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const HomeScreen = () => null;
const ResetPasswordScreen = () => null;
const NotFoundScreen = () => null;

const AppNavigator: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    setNavigationRef(navigationRef);
    initializeDeepLinkHandling();
    const unsubscribe = subscribeToDeepLinks();
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;