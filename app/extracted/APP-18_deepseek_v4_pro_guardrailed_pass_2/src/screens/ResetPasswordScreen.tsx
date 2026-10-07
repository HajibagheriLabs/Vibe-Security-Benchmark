// src/screens/ResetPasswordScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';

/**
 * Reset password screen
 * Security: Token received via navigation params (in-memory only).
 * Token is never persisted to storage. Server validates token ownership.
 */
interface ResetPasswordScreenProps {
  route: {
    params: {
      token: string;
    };
  };
  navigation: any;
}

export function ResetPasswordScreen({ route, navigation }: ResetPasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Token from navigation params - in memory only
  const { token } = route.params;

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      // Call your authenticated API endpoint
      // Security: Server validates the token and its ownership
      const response = await fetch('https://api.yourapp.com/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Password reset successfully');
        navigation.navigate('Login');
      } else {
        Alert.alert('Error', 'Password reset failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  return (
    <View>
      <TextInput
        placeholder="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <Button title="Reset Password" onPress={handleResetPassword} />
    </View>
  );
}