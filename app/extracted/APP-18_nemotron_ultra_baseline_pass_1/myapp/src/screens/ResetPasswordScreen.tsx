import React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/DeepLinkHandler';

type Props = {
  route: RouteProp<RootStackParamList, 'ResetPassword'>;
};

export const ResetPasswordScreen: React.FC<Props> = ({ route }) => {
  const { token } = route.params;
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');

  const handleSubmit = () => {
    if (password !== confirm) {
      alert('Passwords do not match');
      return;
    }
    // TODO: call API with token and new password
    console.log('Reset password with token:', token, 'new password:', password);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <TextInput
        style={styles.input}
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 16, borderRadius: 8 },
});