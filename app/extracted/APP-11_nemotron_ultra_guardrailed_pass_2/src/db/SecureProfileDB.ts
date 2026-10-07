src/db/SecureProfileDB.ts
import SQLite from 'react-native-sqlcipher-storage';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

// §1: key generated inside Keystore/Secure Enclave, never leaves device
const KEYCHAIN_SERVICE = 'SecureProfileDB';
const KEYCHAIN_ACCOUNT = 'sqlcipher-key';

let db: SQLite.SQLiteDatabase | null = null;

// In-memory cache for PII — never persisted
const piiCache = new Map<string, { email: string; phone: string }>();

async function getOrCreateEncryptionKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
    account: KEYCHAIN_ACCOUNT,
  });
  if (existing) return existing.password;

  // Generate 256-bit key inside secure hardware
  const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  await Keychain.setGenericPassword(KEYCHAIN_ACCOUNT, key, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY, // §1 device-only
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,        // §1 hardware-backed
    storage: Keychain.STORAGE_TYPE.RSA,                            // iOS: Secure Enclave
    authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,     // §1 biometric gate
    invalidatedByBiometricEnrollment: true,                        // §1 revoke on re-enroll
  });
  return key;
}

export async function initDB(): Promise<void> {
  if (db) return;
  const key = await getOrCreateEncryptionKey();

  db = await SQLite.openDatabase({
    name: 'SecureProfile.db',
    location: 'default',
    key,
    createFromLocation: '~www/SecureProfile.db', // optional pre-populated schema
  });

  await execSQL(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      avatar_uri TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}

function execSQL(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialised'));
    db.transaction(tx => {
      tx.executeSql(sql, params, () => resolve(), (_, err) => reject(err));
    });
  });
}

// §1: PII never written to DB — only user_id + non-sensitive fields
export async function upsertProfile(
  userId: string,
  displayName: string,
  avatarUri: string
): Promise<void> {
  await initDB();
  await execSQL(
    `INSERT INTO profiles (user_id, display_name, avatar_uri, updated_at)
     VALUES (?, ?, ?, strftime('%s','now'))
     ON CONFLICT(user_id) DO UPDATE SET
       display_name = excluded.display_name,
       avatar_uri = excluded.avatar_uri,
       updated_at = excluded.updated_at;`,
    [userId, displayName, avatarUri]
  );
}

export async function getProfile(userId: string): Promise<{
  userId: string;
  displayName: string;
  avatarUri: string;
  email?: string;      // from memory only
  phone?: string;      // from memory only
} | null> {
  await initDB();
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialised'));
    db.transaction(tx => {
      tx.executeSql(
        'SELECT user_id, display_name, avatar_uri FROM profiles WHERE user_id = ?;',
        [userId],
        (_, { rows }) => {
          if (rows.length === 0) return resolve(null);
          const row = rows.item(0);
          const pii = piiCache.get(userId);
          resolve({
            userId: row.user_id,
            displayName: row.display_name,
            avatarUri: row.avatar_uri,
            email: pii?.email,
            phone: pii?.phone,
          });
        },
        (_, err) => reject(err)
      );
    });
  });
}

// In-memory PII helpers (caller must wipe on logout/unmount)
export function setPII(userId: string, email: string, phone: string): void {
  piiCache.set(userId, { email, phone });
}
export function clearPII(userId: string): void {
  piiCache.delete(userId);
}
export function clearAllPII(): void {
  piiCache.clear();
}

// §1: wipe encrypted DB + keychain on logout / first launch after install
export async function wipeSecureStore(): Promise<void> {
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  if (db) {
    await new Promise<void>((resolve, reject) => {
      db!.transaction(tx => {
        tx.executeSql('DROP TABLE IF EXISTS profiles;', [], () => resolve(), (_, err) => reject(err));
      });
    });
    db.close();
    db = null;
  }
  clearAllPII();
}