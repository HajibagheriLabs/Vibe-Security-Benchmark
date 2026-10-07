import { app } from 'electron';
import { persistentCredentials, PersistentCredentials } from './persistent-credentials';

// Example usage in main process
app.whenReady().then(() => {
  // Save credentials (e.g., after successful login)
  persistentCredentials.save('user@example.com', 's3cret-password');

  // Load credentials on app startup
  const stored = persistentCredentials.load();
  if (stored) {
    console.log(`Welcome back, ${stored.username}`);
    console.log(`Credentials last updated: ${stored.updatedAt}`);
  }

  // Check if credentials exist
  if (persistentCredentials.hasCredentials()) {
    console.log('Credentials found at:', persistentCredentials.getStoragePath());
  }

  // Clear credentials (e.g., on logout)
  // persistentCredentials.clear();
});

// Alternative: create a custom instance with a different filename
// const customStore = new PersistentCredentials('my-app-credentials.json');