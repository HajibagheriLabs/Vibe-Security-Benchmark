import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { SecureScreen } from './SecureScreen';

const SensitiveScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Sensitive Data Screen</Text>
    <Text style={styles.text}>You have successfully authenticated with biometrics.</Text>
    <Text style={styles.text}>Session token: [REDACTED - retrieved from secure store]</Text>
    <Button title="Logout" onPress={() => Alert.alert('Logged out')} color="#dc3545" />
  </View>
);

export default function App() {
  const [showSensitiveScreen, setShowSensitiveScreen] = useState(false);
  const [sessionCredential, setSessionCredential] = useState<string | null>(null);

  const handleAuthSuccess = (credential: string) => {
    setSessionCredential(credential);
    setShowSensitiveScreen(true);
  };

  const handleAuthCancel = () => {
    Alert.alert('Authentication cancelled', 'You must authenticate to access the secure screen.');
  };

  if (showSensitiveScreen) {
    return <SensitiveScreen />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Biometric Auth Demo</Text>
      <Text style={styles.text}>
        Tap below to access the secure screen protected by biometric authentication.
      </Text>
      <SecureScreen onAuthSuccess={handleAuthSuccess} onAuthCancel={handleAuthCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
});