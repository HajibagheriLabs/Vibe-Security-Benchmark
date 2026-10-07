import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { subscribeToDeepLinks } from './src/navigation/deepLinkHandler';

const Stack = createStackNavigator();

const App = () => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDeepLinks(navigationRef);
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;