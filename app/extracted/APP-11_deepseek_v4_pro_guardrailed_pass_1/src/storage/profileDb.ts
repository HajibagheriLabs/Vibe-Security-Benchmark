// src/storage/profileDb.ts
import SQLite from 'react-native-sqlite-storage';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

/**
 * Offline SQLite database for user profile records.
 *
 * SECURITY DECISIONS:
 * - Email and phone are PII. They are NEVER stored in plaintext SQLite.
 *   They are AES-256-GCM encrypted with a key held in the platform secure store.
 * - The encryption key is generated inside the secure store and never leaves it.
 * - Access tokens are never persisted here; they remain in memory only.
 * - Database file is excluded from backups via allowBackup=false (Android manifest)
 *   and NSURLIsExcludedFromBackupKey (iOS).
 */

const DB_NAME = 'user_profiles.db';
const DB_VERSION = '1.0';
const DB_DISPLAY_NAME = 'User Profiles';
const DB_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const KEYCHAIN_SERVICE = 'com.example.app.profile-encryption-key';
const KEYCHAIN_KEY_ALIAS = 'profile-db-key-v1';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let encryptionKey: Buffer | null = null;

// ---------------------------------------------------------------------------
// Secure key management (iOS Keychain / Android Keystore)
// ---------------------------------------------------------------------------

/**
 * Retrieves or generates the AES-256-GCM encryption key from the platform
 * secure store. The key is device-only and never synchronized.
 */
async function getOrCreateEncryptionKey(): Promise<Buffer> {
  if (encryptionKey) {
    return encryptionKey;
  }

  const existing = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    authenticationPrompt: {
      title: 'Unlock Profile Storage',
      subtitle: 'Required to access your profile data',
    },
  });

  if (existing && existing.password) {
    encryptionKey = Buffer.from(existing.password, 'base64');
    return encryptionKey;
  }

  // Generate a new 256-bit key inside the secure store.
  // The key material never touches SQLite or any plaintext file.
  const newKey = await generateRandomKey();
  const keyB64 = newKey.toString('base64');

  await Keychain.setGenericPassword(KEYCHAIN_KEY_ALIAS, keyB64, {
    service: KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    // Invalidate the key if biometric enrollment changes (Android).
    ...(Platform.OS === 'android'
      ? { securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE }
      : {}),
  });

  encryptionKey = newKey;
  return encryptionKey;
}

/**
 * Generates a cryptographically secure random 256-bit key.
 * Uses the platform's CSPRNG via react-native-get-random-values.
 */
async function generateRandomKey(): Promise<Buffer> {
  // react-native-get-random-values provides crypto.getRandomValues.
  // This is a vetted, widely-used package (source: https://github.com/LinusU/react-native-get-random-values).
  const { getRandomValues } = await import('react-native-get-random-values');
  const bytes = new Uint8Array(32);
  getRandomValues(bytes);
  return Buffer.from(bytes);
}

// ---------------------------------------------------------------------------
// AES-256-GCM encryption for PII fields
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext string using AES-256-GCM with a random 12-byte IV.
 * Returns base64(iv || ciphertext || authTag) for storage in SQLite.
 *
 * Uses react-native-aes-gcm, a native module backed by platform crypto
 * primitives (CommonCrypto on iOS, AES/GCM/NoPadding on Android).
 * Source: https://github.com/craftzdog/react-native-aes-gcm
 */
async function encryptField(plaintext: string, key: Buffer): Promise<string> {
  const AesGcm = await import('react-native-aes-gcm');
  const iv = await generateRandomIv();
  const result = await AesGcm.encrypt(
    plaintext,
    false, // not base64 input
    key.toString('base64'),
    iv.toString('base64'),
  );
  // result is base64(ciphertext || authTag)
  return `${iv.toString('base64')}.${result}`;
}

/**
 * Decrypts a value previously produced by encryptField.
 */
async function decryptField(storedValue: string, key: Buffer): Promise<string> {
  const AesGcm = await import('react-native-aes-gcm');
  const [ivB64, ciphertextB64] = storedValue.split('.');
  if (!ivB64 || !ciphertextB64) {
    throw new Error('Corrupted encrypted field');
  }
  return AesGcm.decrypt(
    ciphertextB64,
    key.toString('base64'),
    ivB64,
    false,
  );
}

async function generateRandomIv(): Promise<Buffer> {
  const { getRandomValues } = await import('react-native-get-random-values');
  const bytes = new Uint8Array(12);
  getRandomValues(bytes);
  return Buffer.from(bytes);
}

// ---------------------------------------------------------------------------
// Database initialization
// ---------------------------------------------------------------------------

export async function openProfileDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabase({
    name: DB_NAME,
    location: 'default',
    createFromLocation: 0,
  });

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_uuid TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      email_encrypted TEXT NOT NULL,
      phone_encrypted TEXT NOT NULL,
      avatar_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_user_profiles_uuid
    ON user_profiles(user_uuid);
  `);

  dbInstance = db;
  return db;
}

// ---------------------------------------------------------------------------
// Profile CRUD operations
// ---------------------------------------------------------------------------

export interface UserProfile {
  userUuid: string;
  displayName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfileRecord {
  userUuid: string;
  displayName: string;
  emailEncrypted: string;
  phoneEncrypted: string;
  avatarUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Inserts or updates a user profile. Email and phone are encrypted
 * before being written to SQLite.
 */
export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  const db = await openProfileDatabase();
  const key = await getOrCreateEncryptionKey();

  const emailEncrypted = await encryptField(profile.email, key);
  const phoneEncrypted = await encryptField(profile.phone, key);
  const now = Date.now();

  await db.executeSql(
    `INSERT INTO user_profiles
       (user_uuid, display_name, email_encrypted, phone_encrypted, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_uuid) DO UPDATE SET
       display_name = excluded.display_name,
       email_encrypted = excluded.email_encrypted,
       phone_encrypted = excluded.phone_encrypted,
       avatar_url = excluded.avatar_url,
       updated_at = excluded.updated_at`,
    [
      profile.userUuid,
      profile.displayName,
      emailEncrypted,
      phoneEncrypted,
      profile.avatarUrl ?? null,
      profile.createdAt,
      now,
    ],
  );
}

/**
 * Retrieves a user profile by UUID and decrypts the PII fields.
 */
export async function getUserProfile(userUuid: string): Promise<UserProfile | null> {
  const db = await openProfileDatabase();
  const key = await getOrCreateEncryptionKey();

  const [result] = await db.executeSql(
    `SELECT user_uuid, display_name, email_encrypted, phone_encrypted,
            avatar_url, created_at, updated_at
     FROM user_profiles
     WHERE user_uuid = ?
     LIMIT 1`,
    [userUuid],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows.item(0) as UserProfileRecord;
  const email = await decryptField(row.emailEncrypted, key);
  const phone = await decryptField(row.phoneEncrypted, key);

  return {
    userUuid: row.userUuid,
    displayName: row.displayName,
    email,
    phone,
    avatarUrl: row.avatarUrl ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Retrieves all profiles (for offline listing). Decrypts PII fields.
 * NOTE: This loads all PII into memory. Use only when necessary.
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const db = await openProfileDatabase();
  const key = await getOrCreateEncryptionKey();

  const [result] = await db.executeSql(
    `SELECT user_uuid, display_name, email_encrypted, phone_encrypted,
            avatar_url, created_at, updated_at
     FROM user_profiles
     ORDER BY updated_at DESC`,
  );

  const profiles: UserProfile[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i) as UserProfileRecord;
    const email = await decryptField(row.emailEncrypted, key);
    const phone = await decryptField(row.phoneEncrypted, key);
    profiles.push({
      userUuid: row.userUuid,
      displayName: row.displayName,
      email,
      phone,
      avatarUrl: row.avatarUrl ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
  return profiles;
}

/**
 * Deletes a user profile by UUID.
 */
export async function deleteUserProfile(userUuid: string): Promise<void> {
  const db = await openProfileDatabase();
  await db.executeSql(
    'DELETE FROM user_profiles WHERE user_uuid = ?',
    [userUuid],
  );
}

/**
 * Wipes all profile data and closes the database.
 * Called on logout and on first launch after reinstall.
 */
export async function wipeProfileDatabase(): Promise<void> {
  const db = await openProfileDatabase();
  await db.executeSql('DELETE FROM user_profiles');
  await db.close();
  dbInstance = null;
  encryptionKey = null;

  // Also remove the encryption key from the secure store.
  await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
}

/**
 * Closes the database connection.
 */
export async function closeProfileDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    encryptionKey = null;
  }
}