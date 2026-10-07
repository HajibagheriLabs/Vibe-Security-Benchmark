import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Linking } from 'react-native';
import { OAuthRedirectHandler } from './OAuthRedirectHandler';
import { TokenStorage } from './utils/TokenStorage';
import { AuthService } from './services/AuthService';
import { RootStackParamList } from './navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootStackParamList['AppTabs']>();

const AppTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const HomeScreen = () => <View><Text>Home</Text></View>;
const ProfileScreen = () => <View><Text>Profile</Text></View>;
const SettingsScreen = () => <View><Text>Settings</Text></View>;
const LoginScreen = () => <View><Text>Login</Text></View>;

const linking = {
  prefixes: ['com.yourapp://'],
  config: {
    screens: {
      OAuthRedirect: 'oauth2redirect',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AuthStack" component={AuthStackScreen} />
        <Stack.Screen name="OAuthRedirect" component={OAuthRedirectHandler} />
        <Stack.Screen name="AppTabs" component={AppTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const AuthStackScreen = () => (
  <Stack.Navigator>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="OAuthRedirect" component={OAuthRedirectHandler} />
  </Stack.Navigator>
);