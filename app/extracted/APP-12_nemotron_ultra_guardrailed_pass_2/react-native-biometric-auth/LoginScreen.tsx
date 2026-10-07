import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SecureCredentialStore } from './SecureCredentialStore';
import { Platform } from 'react-native';

export const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const biometryAvailable = await SecureCredentialStore.isBiometryAvailable();
      if (!biometryAvailable) {
        Alert.alert('Biometrics Unavailable', 'This device does not support biometric authentication');
        setLoading(false);
        return;
      }

      await SecureCredentialStore.store({ username, password });
      Alert.alert('Success', 'Credentials stored securely. Biometric gate is now active.');
    } catch (e: any) {
      Alert.alert('Error', `Failed to store credentials: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to Enable Biometric Gate</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password / Refresh Token"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? 'Storing...' : 'Store Credentials'} onPress={handleLogin} disabled={loading} />
      {loading && <ActivityIndicator />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
});