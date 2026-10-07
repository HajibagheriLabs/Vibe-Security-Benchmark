// App.js
import { AuthProvider } from 'react-native-auth-service';

const authConfig = {
  authEndpoint: 'https://auth.example.com/authorize',
  tokenEndpoint: 'https://auth.example.com/token',
  revokeEndpoint: 'https://auth.example.com/revoke',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret', // Optional for public clients
  redirectUri: 'myapp://callback',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
};

export default function App() {
  return (
    <AuthProvider config={authConfig}>
      <YourApp />
    </AuthProvider>
  );
}