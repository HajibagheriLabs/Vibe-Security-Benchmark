import * as FileSystem from 'expo-file-system';
import { encryptDocument, decryptDocument } from './encryption';

const CACHE_DIR = `${FileSystem.cacheDirectory}encrypted_docs/`;

async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function getCachePath(documentId: string): string {
  return `${CACHE_DIR}${documentId}.enc`;
}

export async function cacheDocument(documentId: string, content: string): Promise<void> {
  await ensureCacheDir();
  const encrypted = await encryptDocument(content);
  const path = getCachePath(documentId);
  await FileSystem.writeAsStringAsync(path, encrypted, { encoding: 'base64' });
}

export async function getCachedDocument(documentId: string): Promise<string | null> {
  await ensureCacheDir();
  const path = getCachePath(documentId);
  
  const fileInfo = await FileSystem.getInfoAsync(path);
  if (!fileInfo.exists) {
    return null;
  }
  
  try {
    const encrypted = await FileSystem.readAsStringAsync(path, { encoding: 'base64' });
    return await decryptDocument(encrypted);
  } catch {
    await FileSystem.deleteAsync(path, { idempotent: true });
    return null;
  }
}

export async function deleteCachedDocument(documentId: string): Promise<void> {
  const path = getCachePath(documentId);
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function clearAllCachedDocuments(): Promise<void> {
  await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
}

export async function listCachedDocuments(): Promise<string[]> {
  await ensureCacheDir();
  const dirInfo = await FileSystem.readDirectoryAsync(CACHE_DIR);
  return dirInfo
    .filter(name => name.endsWith('.enc'))
    .map(name => name.slice(0, -4));
}

export async function getCacheSize(): Promise<number> {
  await ensureCacheDir();
  const dirInfo = await FileSystem.readDirectoryAsync(CACHE_DIR);
  let totalSize = 0;
  
  for (const file of dirInfo) {
    const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIR}${file}`);
    if (fileInfo.exists && 'size' in fileInfo) {
      totalSize += fileInfo.size;
    }
  }
  
  return totalSize;
}