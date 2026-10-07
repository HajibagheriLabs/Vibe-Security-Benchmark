import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Checkout } from '../components/Checkout';

const Stack = createStackNavigator();

export const CheckoutNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Checkout">
        <Stack.Screen 
          name="Checkout" 
          component={Checkout}
          options={{ headerTitle: 'Checkout' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};