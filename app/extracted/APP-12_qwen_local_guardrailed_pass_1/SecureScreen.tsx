import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { deleteCredential } from './SecureStorageService';

// Rule §1: Wipe the whole store on logout.
export const SecureScreen: React.FC = () => {
  const handleLogout = async () => {
    await deleteCredential();
    Alert.alert('Logged Out', 'Credentials wiped.');
    // Navigate back to gate or login
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sensitive Data</Text>
      <Text>This screen is protected by biometrics.</Text>
      <Text>User ID: 12345</Text>
      <Text>Balance: $1,000,000</Text>
      
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

// Simple Button component for brevity
const Button = ({ title, onPress }: { title: string, onPress: () => void }) => (
  <View style={{ marginTop: 40 }}>
    <Text 
      onPress={onPress} 
      style={{ color: 'blue', fontSize: 18, textDecorationLine: 'underline' }}
    >
      {title}
    </Text>
  </View>
);