import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, Button, StyleSheet } from 'react-native';
import { SensitiveScreen } from '../screens/SensitiveScreen';

const Stack = createStackNavigator();

const HomeScreen: React.FC = ({ navigation }) => (
  <View style={styles.screen}>
    <Text style={styles.title}>Biometric Auth Demo</Text>
    <Text style={styles.description}>
      Tap below to navigate to the biometrically protected screen.
    </Text>
    <Button
      title="Go to Sensitive Screen"
      onPress={() => navigation.navigate('Sensitive')}
      style={styles.button}
    />
  </View>
);

export const AppNavigator: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Stack.Screen name="Sensitive" component={SensitiveScreen} options={{ title: 'Secure Area' }} />
    </Stack.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    width: '80%',
  },
});