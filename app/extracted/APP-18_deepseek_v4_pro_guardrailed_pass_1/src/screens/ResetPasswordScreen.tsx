// src/screens/ResetPasswordScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Alert, ActivityIndicator } from 'react-native';

/**
 * Reset password screen
 * 
 * SECURITY: The token from the deep link is sent to the server for validation.
 * The client NEVER trusts the token to authorize the password change directly.
 * The server validates the token, checks expiration, and confirms the reset
 * is for the correct account before accepting a new password.
 */

interface ResetPasswordScreenProps {
  route: {
    params: {
      token: string;
    };
  };
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ route }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  
  const { token } = route.params;
  
  useEffect(() => {
    validateToken();
  }, []);
  
  const validateToken = async () => {
    try {
      // Server-side validation of the reset token
      const response = await fetch('https://api.example.com/validate-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      if (response.ok) {
        setTokenValid(true);
      } else {
        Alert.alert('Invalid Link', 'This password reset link is invalid or has expired.');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to validate reset link. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    
    try {
      // Server performs the actual password reset after validating the token
      const response = await fetch('https://api.example.com/reset-password', {
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
        Alert.alert('Success', 'Password has been reset successfully');
        // Navigate to login
      } else {
        Alert.alert('Error', 'Password reset failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };
  
  if (isValidating) {
    return (
      <View>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  if (!tokenValid) {
    return (
      <View>
        <Button title="Go to Login" onPress={() => {/* navigate to login */}} />
      </View>
    );
  }
  
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
      <Button title="Reset Password" onPress={handlePasswordReset} />
    </View>
  );
};