// src/auth/sessionManager.ts
import * as SecureStore from 'expo-secure-store';

/**
 * In-memory session holder. Access tokens NEVER touch disk.
 */
let inMemoryAccessToken: string | null = null;
let tokenExpiry: number | null = null;

export function setAccessToken(token: string, expiresIn: number): void {
  inMemoryAccessToken = token;
  tokenExpiry = Date.now() + expiresIn * 1000;
}

export function getAccessToken(): string | null {
  if (inMemoryAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return inMemoryAccessToken;
  }
  // Token expired — caller should refresh using the stored refresh credential
  return null;
}

export function clearAccessToken(): void {
  inMemoryAccessToken = null;
  tokenExpiry = null;
}

/**
 * Refresh the access token using the stored refresh credential.
 * Called by the backend gateway, never directly from the client.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync('oauth.refresh.token', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  if (!refreshToken) {
    return null;
  }

  // Call our backend to refresh — never the vendor directly
  const response = await fetch('https://api.example.com/auth/oauth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  setAccessToken(data.access_token, data.expires_in);
  return data.access_token;
}