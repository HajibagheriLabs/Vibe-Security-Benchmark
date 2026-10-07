import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenResponse } from '../services/OAuthService';

const SESSION_KEY = '@auth/session';
const SESSION_EXPIRY_KEY = '@auth/session_expiry';

interface StoredSession extends TokenResponse {
  storedAt: number;
}

/**
 * Persists the OAuth session tokens securely.
 * In production, consider using react-native-keychain or expo-secure-store
 * for storing sensitive tokens instead of AsyncStorage.
 */
export async function storeSession(session: TokenResponse): Promise<void> {
  const storedSession: StoredSession = {
    ...session,
    storedAt: Date.now(),
  };

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(storedSession));
  await AsyncStorage.setItem(
    SESSION_EXPIRY_KEY,
    String(Date.now() + session.expiresIn * 1000)
  );
}

export async function getSession(): Promise<StoredSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([SESSION_KEY, SESSION_EXPIRY_KEY]);
}

export async function isSessionExpired(): Promise<boolean> {
  const expiryRaw = await AsyncStorage.getItem(SESSION_EXPIRY_KEY);
  if (!expiryRaw) return true;

  const expiry = parseInt(expiryRaw, 10);
  return Date.now() >= expiry;
}