import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

// Rule 4: Screens fetch their own data using the session identity.
// Rule 4: The server returns 404 for resources the session does not own.

type ResetPasswordParams = {
  token: string;
};

type ResetPasswordScreenProps = {
  route: RouteProp<{ params: ResetPasswordParams }, 'params'>;
};

export const ResetPasswordScreen: React.FC = () => {
  const { params } = useRoute<ResetPasswordScreenProps>();
  const { token } = params;

  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Validate token format locally before API call
    if (!token || token.length < 10) {
      setStatus('error');
      return;
    }
    // Optional: Pre-fetch validation if required by architecture
  }, [token]);

  const handleReset = async () => {
    if (!newPassword) return;
    setStatus('loading');

    try {
      // Rule 4: Gateway order: authenticate → authorize → validate schema → call vendor
      const response = await fetch('https://api.myapp.com/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Rule 3: Auth token comes from secure storage, not the URL
          'Authorization': 'Bearer ' + (await getAuthToken()), 
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      if (!response.ok) {
        // Rule 4: Server returns 404 for invalid/expired tokens
        throw new Error('Reset failed');
      }

      setStatus('success');
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Reset Password</Text>
      <TextInput
        secureTextEntry
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
      />
      {status === 'loading' && <ActivityIndicator />}
      {status === 'error' && <Text style={{ color: 'red' }}>Invalid or expired token.</Text>}
      {status === 'success' && <Text style={{ color: 'green' }}>Password reset successful.</Text>}
      
      <Button 
        title="Reset" 
        onPress={handleReset} 
        disabled={status === 'loading'}
      />
    </View>
  );
};

// Helper to get auth token from secure store
async function getAuthToken(): Promise<string> {
  // Rule 1: Sensitive persistence uses only secure stores
  const { default: SecureStore } = await import('expo-secure-store');
  const token = await SecureStore.getItemAsync('auth_token');
  if (!token) throw new Error('No auth token');
  return token;
}