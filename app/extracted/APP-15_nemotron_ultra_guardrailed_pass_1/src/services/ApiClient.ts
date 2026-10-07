import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = 'https://api.example.com/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function getAuthHeader(): Promise<string | null> {
  // Access token kept only in memory by the auth module; refresh token in secure store.
  // This is a simplified example — real impl would use an in-memory token store.
  return SecureStore.getItemAsync('access_token');
}

export const apiClient = {
  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = await getAuthHeader();
    const url = new URL(`${API_BASE_URL}${path}`);
    if (options.params) {
      Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      // React Native fetch respects system TLS; no custom trust manager.
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  // POST / PUT / DELETE helpers omitted for brevity — same pattern.
};