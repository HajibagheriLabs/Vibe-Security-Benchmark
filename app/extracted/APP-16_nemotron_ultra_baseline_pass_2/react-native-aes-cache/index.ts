export {
  encryptDocument,
  decryptDocument,
  clearEncryptionKey,
  rotateEncryptionKey,
} from './encryption';

export {
  cacheDocument,
  getCachedDocument,
  deleteCachedDocument,
  clearAllCachedDocuments,
  listCachedDocuments,
  getCacheSize,
} from './cache';

export type { EncryptedPayload } from './encryption';