import {
  cacheDocument,
  getCachedDocument,
  deleteCachedDocument,
  listCachedDocuments,
  clearAllCachedDocuments,
  getCacheSize,
  rotateEncryptionKey,
} from 'react-native-aes-cache';

// Cache a user document
await cacheDocument('user_profile_123', JSON.stringify({
  name: 'John Doe',
  email: 'john@example.com',
  preferences: { theme: 'dark', notifications: true }
}));

// Retrieve and decrypt
const profile = await getCachedDocument('user_profile_123');
if (profile) {
  const data = JSON.parse(profile);
  console.log(data.name); // "John Doe"
}

// List all cached documents
const docs = await listCachedDocuments();
// ['user_profile_123', 'settings_456', 'draft_789']

// Delete specific document
await deleteCachedDocument('draft_789');

// Get total cache size
const sizeBytes = await getCacheSize();

// Rotate encryption key (invalidates all existing cached documents)
await rotateEncryptionKey();

// Clear everything
await clearAllCachedDocuments();