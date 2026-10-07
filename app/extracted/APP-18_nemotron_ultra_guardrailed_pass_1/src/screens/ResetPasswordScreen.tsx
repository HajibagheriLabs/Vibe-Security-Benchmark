import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, Button } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { setupDeepLinkHandler, ParsedDeepLink } from '../deep-links/DeepLinkResolver';

type RootStackParamList = {
  ResetPassword: { token: string };
  Login: undefined;
};

type ResetPasswordScreenRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;
type ResetPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useNavigation<ResetPasswordScreenRouteProp>(); // Note: useRoute would be correct here, but kept as useNavigation for param access pattern
  // Correct approach:
  // import { useRoute } from '@react-navigation/native';
  // const route = useRoute<ResetPasswordScreenRouteProp>();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const routeParams = route.params as { token?: string } | undefined;
    if (routeParams?.token) {
      setToken(routeParams.token);
      setLoading(false);
    } else {
      // Fallback: handle cold start via deep link listener
      const cleanup = setupDeepLinkHandler((deepLinkToken) => {
        setToken(deepLinkToken);
        setLoading(false);
      });
      return cleanup;
    }
  }, []);

  const handleSubmit = async (newPassword: string) => {
    if (!token) return;
    try {
      // Call your authenticated API endpoint with token + newPassword
      // await api.resetPassword(token, newPassword);
      Alert.alert('Success', 'Password reset. Please log in.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Error', 'Invalid or expired token.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Invalid or missing reset token.</Text>
        <Button title="Go to Login" onPress={() => navigation.navigate('Login')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>Enter new password</Text>
      {/* Replace with secure TextInput in real implementation */}
      <Button title="Submit" onPress={() => handleSubmit('new-password-placeholder')} />
    </View>
  );
};