// LoginScreen.js
import { useAuth } from 'react-native-auth-service';
import { View, Button, TextInput } from 'react-native';

export function LoginScreen() {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      // Option 1: Username/password (resource owner password credentials)
      await login({ username: 'user@example.com', password: 'secret' });
      
      // Option 2: OAuth redirect (returns { authUrl, requiresBrowser: true })
      // const { authUrl } = await login();
      // Open authUrl in WebBrowser / SafariViewController
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View>
      <Button title="Login" onPress={handleLogin} disabled={isLoading} />
    </View>
  );
}