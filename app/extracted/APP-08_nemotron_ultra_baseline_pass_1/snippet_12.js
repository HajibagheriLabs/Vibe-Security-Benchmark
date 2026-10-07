import { AuthService } from 'react-native-auth-service';

// Check authentication status
if (AuthService.isAuthenticated()) {
  const token = AuthService.getAccessToken();
}

// Manually refresh
await AuthService.refreshAccessToken(tokenEndpoint, clientId, clientSecret);

// Update user profile data
await AuthService.updateUserData({ name: 'New Name', avatar: 'url' });