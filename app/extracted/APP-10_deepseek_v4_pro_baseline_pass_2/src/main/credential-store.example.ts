import { app } from 'electron';
import { getCredentialStore, StoredCredentials } from './credential-store';

/**
 * Example usage of CredentialStore in the main process.
 * This demonstrates the typical lifecycle: load on startup, save on login, clear on logout.
 */
export async function initializeCredentialPersistence(): Promise<void> {
  // Wait for app to be ready
  if (!app.isReady()) {
    await new Promise<void>((resolve) => {
      app.once('ready', () => resolve());
    });
  }

  const store = getCredentialStore();

  // Check if we have stored credentials from a previous session
  const storedCredentials = store.loadCredentials();

  if (storedCredentials) {
    console.log(`Welcome back, ${storedCredentials.username}!`);
    // Use the credentials to auto-login or pre-fill forms
    // await autoLogin(storedCredentials);
  } else {
    console.log('No stored credentials found. User will need to log in.');
  }
}

export function handleUserLogin(username: string, password: string, rememberMe: boolean): void {
  const store = getCredentialStore();

  if (rememberMe) {
    const credentials: StoredCredentials = {
      username,
      password,
      rememberMe: true,
      lastLoginAt: new Date().toISOString(),
    };

    const encrypted = store.saveCredentials(credentials);
    console.log(`Credentials saved ${encrypted ? 'securely' : 'insecurely (encryption unavailable)'}.`);
  } else {
    // If user doesn't want to be remembered, clear any existing credentials
    store.clearCredentials();
  }
}

export function handleUserLogout(): void {
  const store = getCredentialStore();
  store.clearCredentials();
  console.log('Credentials cleared.');
}