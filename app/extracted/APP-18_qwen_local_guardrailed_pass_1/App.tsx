import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { setupDeepLinkListener } from './modules/deep-links';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';

const Stack = createStackNavigator();

export default function App() {
  const navigationRef = useRef<any>(null);

  // Rule 4: ONE resolver handles all deep links
  const linkSubscription = setupDeepLinkListener(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Placeholder for Home
function HomeScreen() {
  return null;
}