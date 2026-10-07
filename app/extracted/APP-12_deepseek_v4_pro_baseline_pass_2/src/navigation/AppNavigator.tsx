import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SensitiveDataScreen } from '../screens/SensitiveDataScreen';

export type RootStackParamList = {
  Home: undefined;
  SensitiveData: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Placeholder Home screen — replace with your actual home screen
function HomeScreen({ navigation }: { navigation: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Pressable
        onPress={() => navigation.navigate('SensitiveData')}
        style={{ marginTop: 16, padding: 12, backgroundColor: '#3B82F6', borderRadius: 8 }}
      >
        <Text style={{ color: '#fff' }}>Open Sensitive Data</Text>
      </Pressable>
    </View>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="SensitiveData"
          component={SensitiveDataScreen}
          options={{
            title: 'Sensitive Data',
            headerBackVisible: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}