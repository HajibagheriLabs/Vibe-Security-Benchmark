if (!credentialStore.isEncryptionAvailable()) {
  console.warn('OS encryption unavailable - credentials cannot be stored securely');
  // Fallback: disable "Remember me" option
}