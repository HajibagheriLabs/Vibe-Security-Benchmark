// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDeepLinkSetup } from './src/navigation/DeepLinkSetup';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = React.useRef(null);
  
  // Set up deep link handling
  useDeepLinkSetup(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}