import { createCredentialStore } from 'electron-credential-store';

// Initialize in your main process
const credentialStore = createCredentialStore({
  serviceName: 'my-app',
  fileName: 'user-credentials.enc'
});

// Save credentials after successful login
async function onLogin(username: string, password: string) {
  const saved = await credentialStore.saveCredentials(username, password);
  if (saved) {
    console.log('Credentials stored securely');
  }
}

// Retrieve credentials on app startup
async function restoreSession() {
  const credentials = await credentialStore.getCredentials();
  if (credentials) {
    // Auto-login with stored credentials
    await login(credentials.username, credentials.password);
  }
}

// Check if credentials exist
if (await credentialStore.hasCredentials()) {
  // Show "Continue as..." option
}

// Clear credentials on logout
async function onLogout() {
  await credentialStore.deleteCredentials();
}