import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SensitiveScreen } from '../screens/SensitiveScreen';

export type RootStackParamList = {
  Home: undefined;
  Sensitive: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen() {
  // Placeholder home screen — replace with your actual home screen
  return null;
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Sensitive"
          component={SensitiveScreen}
          options={{
            title: 'Sensitive Data',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}