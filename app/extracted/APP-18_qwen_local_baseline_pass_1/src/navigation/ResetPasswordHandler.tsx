// src/navigation/ResetPasswordHandler.tsx
import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the structure for the reset password params
interface ResetPasswordParams {
  token: string;
}

// Define the navigation stack types (assuming a standard setup)
// In a real app, these would be imported from your navigation types file
type RootStackParamList = {
  ResetPassword: { token: string };
  Home: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Utility to parse the deep link
const parseDeepLink = (url: string): ResetPasswordParams | null => {
  try {
    const { origin, pathname, searchParams } = new URL(url);
    
    // Check if the scheme and pathname match the expected deep link
    if (origin !== 'myapp' || pathname !== '/reset-password') {
      return null;
    }

    const token = searchParams.get('token');
    if (!token) {
      return null;
    }

    return { token };
  } catch (e) {
    console.error('Failed to parse deep link:', e);
    return null;
  }
};

// The handler component
export const ResetPasswordHandler: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle initial deep link when app opens
    const handleInitialURL = async (event: { url: string | null }) => {
      const { url } = event;
      if (url) {
        const params = parseDeepLink(url);
        if (params) {
          navigation.navigate('ResetPassword', params);
        } else {
          setError('Invalid deep link format');
        }
      } else {
        // No deep link provided, navigate to home
        navigation.navigate('Home');
      }
      setLoading(false);
    };

    // Get the initial URL
    Linking.getInitialURL().then(handleInitialURL).catch((err) => {
      console.error('Error getting initial URL:', err);
      setError('Failed to process deep link');
      setLoading(false);
    });

    // Listen for subsequent deep links
    const subscription = Linking.addEventListener('url', (event) => {
      const params = parseDeepLink(event.url);
      if (params) {
        navigation.navigate('ResetPassword', params);
      } else {
        setError('Invalid deep link format');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.subtext}>Redirecting to home...</Text>
      </View>
    );
  }

  // If no deep link was processed, show a fallback
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No deep link detected.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
});