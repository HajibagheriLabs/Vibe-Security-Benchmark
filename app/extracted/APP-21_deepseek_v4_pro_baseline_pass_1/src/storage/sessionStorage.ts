/**
 * Session persistence using AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserSession } from '../services/authService';

const SESSION_STORAGE_KEY = '@auth/session';
const SESSION_VERSION = 1;

interface StoredSession extends UserSession {
  /** Schema version for future migrations */
  version: number;
}

/**
 * Persist a user session to local storage.
 */
export async function storeSession(session: UserSession): Promise<void> {
  const storedSession: StoredSession = {
    ...session,
    version: SESSION_VERSION,
  };

  await AsyncStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(storedSession),
  );
}

/**
 * Retrieve the persisted user session, if any.
 * Returns null if no session exists or if it has expired.
 */
export async function getSession(): Promise<UserSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;

    // Check if the session has expired
    if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      await clearSession();
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      userId: parsed.userId,
    };
  } catch {
    // Corrupted data — clear it
    await clearSession();
    return null;
  }
}

/**
 * Remove the persisted session (logout).
 */
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Check if a valid (non-expired) session exists.
 */
export async function hasValidSession(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.expiresAt > Date.now();
}