import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { 
  encryptDocumentToBuffer, 
  decryptDocumentFromBuffer,
  wipeDocumentCacheKeys 
} from './documentCrypto';

/**
 * Security rule set applied: §1 STORAGE — the device is hostile.
 * - Documents are stored encrypted at rest using AES-256-GCM.
 * - Cache directory is excluded from backups on both platforms.
 * - No plaintext document ever touches disk.
 */

const CACHE_DIR = Platform.select({
  ios: `${RNFS.CachesDirectoryPath}/encrypted-documents`,
  android: `${RNFS.CachesDirectoryPath}/encrypted-documents`,
  default: '',
}) as string;

const DOCUMENT_EXTENSION = '.enc';

/**
 * Ensures the encrypted cache directory exists.
 */
async function ensureCacheDirectory(): Promise<void> {
  const exists = await RNFS.exists(CACHE_DIR);
  if (!exists) {
    await RNFS.mkdir(CACHE_DIR);
  }
}

/**
 * Sanitizes a document ID to prevent path traversal.
 * Only allows alphanumeric characters, hyphens, and underscores.
 */
function sanitizeDocumentId(documentId: string): string {
  const sanitized = documentId.replace(/[^a-zA-Z0-9-_]/g, '');
  if (sanitized !== documentId) {
    throw new Error('Invalid document ID: contains disallowed characters');
  }
  if (sanitized.length === 0 || sanitized.length > 128) {
    throw new Error('Invalid document ID: must be 1-128 characters');
  }
  return sanitized;
}

/**
 * Caches a document to disk with AES-256-GCM encryption.
 * 
 * @param documentId - Unique identifier for the document
 * @param content - Document content as string or Buffer
 */
export async function cacheDocument(
  documentId: string,
  content: string | Buffer
): Promise<void> {
  const safeId = sanitizeDocumentId(documentId);
  await ensureCacheDirectory();
  
  const encryptedContent = await encryptDocumentToBuffer(content, safeId);
  const filePath = `${CACHE_DIR}/${safeId}${DOCUMENT_EXTENSION}`;
  
  await RNFS.writeFile(filePath, encryptedContent.toString('base64'), 'utf8');
  
  // Zero out the encrypted buffer from memory
  encryptedContent.fill(0);
}

/**
 * Retrieves and decrypts a cached document.
 * 
 * @param documentId - Unique identifier for the document
 * @returns Decrypted document content as Buffer
 */
export async function getCachedDocument(documentId: string): Promise<Buffer> {
  const safeId = sanitizeDocumentId(documentId);
  const filePath = `${CACHE_DIR}/${safeId}${DOCUMENT_EXTENSION}`;
  
  const exists = await RNFS.exists(filePath);
  if (!exists) {
    throw new Error(`Document not found in cache: ${safeId}`);
  }
  
  const encryptedBase64 = await RNFS.readFile(filePath, 'utf8');
  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
  
  return decryptDocumentFromBuffer(encryptedBuffer, safeId);
}

/**
 * Removes a cached document from disk.
 */
export async function removeCachedDocument(documentId: string): Promise<void> {
  const safeId = sanitizeDocumentId(documentId);
  const filePath = `${CACHE_DIR}/${safeId}${DOCUMENT_EXTENSION}`;
  
  const exists = await RNFS.exists(filePath);
  if (exists) {
    await RNFS.unlink(filePath);
  }
}

/**
 * Clears all cached documents and wipes encryption keys.
 * Should be called on logout.
 */
export async function clearDocumentCache(): Promise<void> {
  const exists = await RNFS.exists(CACHE_DIR);
  if (exists) {
    await RNFS.unlink(CACHE_DIR);
  }
  await wipeDocumentCacheKeys();
}

/**
 * Lists all cached document IDs (without decrypting content).
 */
export async function listCachedDocuments(): Promise<string[]> {
  const exists = await RNFS.exists(CACHE_DIR);
  if (!exists) {
    return [];
  }
  
  const files = await RNFS.readDir(CACHE_DIR);
  return files
    .filter(file => file.isFile() && file.name.endsWith(DOCUMENT_EXTENSION))
    .map(file => file.name.slice(0, -DOCUMENT_EXTENSION.length));
}