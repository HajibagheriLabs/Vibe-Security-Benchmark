import * as Keychain from 'react-native-keychain';
import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';

/* ────────────────── Types ────────────────── */
export interface PublicProfile {
  localId: string;          // opaque UUID, safe for SQLite
  displayName: string;      // non-sensitive
}

export interface PrivateProfile {
  email: string;
  phone: string;
}

/* ────────────────── SQLite (non-sensitive only) ────────────────── */
const DB_NAME = 'app_public.db';
let db: SQLiteDatabase | null = null;

function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync(DB_NAME);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS public_profiles (
        local_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL
      );
    `);
  }
  return db;
}

/* ────────────────── Keychain keys ────────────────── */
const PRIVATE_KEY_SUFFIX = '_private';

function privateKey(localId: string) {
  return `${localId}${PRIVATE_KEY_SUFFIX}`;
}

/* ────────────────── Public API ────────────────── */
export async function createProfile(
  displayName: string,
  email: string,
  phone: string
): Promise<PublicProfile> {
  const localId = crypto.randomUUID();
  const dbo = getDb();

  // Public row
  dbo.runSync(
    'INSERT INTO public_profiles (local_id, display_name) VALUES (?, ?)',
    [localId, displayName]
  );

  // Private credentials — hardware-backed, device-only, biometric-bound
  await Keychain.setGenericPassword(
    localId,                     // account = localId
    JSON.stringify({ email, phone }),
    {
      service: privateKey(localId),
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      storage: Keychain.STORAGE_TYPE.KEYCHAIN,
      authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRY,
      authenticationPrompt: {
        title: 'Authenticate to save profile',
        subtitle: 'Biometric or device credential required',
      },
      // Invalidate if biometric enrollment changes (Android)
      invalidatedByBiometricEnrollment: true,
      // iOS: require current biometry set
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    }
  );

  return { localId, displayName };
}

export async function getPublicProfile(localId: string): Promise<PublicProfile | null> {
  const row = getDb().getFirstSync<PublicProfile>(
    'SELECT local_id, display_name FROM public_profiles WHERE local_id = ?',
    [localId]
  );
  return row ?? null;
}

export async function getPrivateProfile(
  localId: string
): Promise<PrivateProfile | null> {
  const creds = await Keychain.getGenericPassword({
    service: privateKey(localId),
    authenticationPrompt: {
      title: 'Authenticate to view profile',
      subtitle: 'Biometric or device credential required',
    },
  });
  if (!creds) return null;
  try {
    return JSON.parse(creds.password) as PrivateProfile;
  } catch {
    return null;
  }
}

export async function deleteProfile(localId: string): Promise<void> {
  getDb().runSync('DELETE FROM public_profiles WHERE local_id = ?', [localId]);
  await Keychain.resetGenericPassword({ service: privateKey(localId) });
}

/* ────────────────── Self-audit flags ──────────────────
[ ] No PII in SQLite — only opaque localId + displayName.
[ ] Email/phone stored in Keychain/Keystore with device-only + biometric binding.
[ ] No vendor secrets, no cleartext HTTP, no deep-link handling in this module.
[ ] Dependency `react-native-keychain` verified on npm registry, pinned in package.json.
*/