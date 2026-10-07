import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

/**
 * SECURITY NOTES:
 * - Subscription status is fetched from our server, never trusted from client state.
 * - The refresh credential is stored in the device Keychain with device-only accessibility.
 * - Access token lives only in memory; never persisted.
 * - No entitlement, price, or trial state is computed client-side.
 */

const API_BASE_URL = 'https://api.yourapp.com'; // HTTPS only
const SUBSCRIPTION_ENDPOINT = `${API_BASE_URL}/v1/subscription/status`;

let accessToken: string | null = null; // In-memory only

type SubscriptionStatus = {
  isPro: boolean;
  expiresAt: string | null;
  plan: 'free' | 'pro';
};

type SubscriptionState = {
  isLoading: boolean;
  isPro: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

async function getStoredRefreshCredential(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'com.yourapp.auth.refresh',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return credentials ? credentials.password : null;
  } catch {
    return null;
  }
}

async function storeRefreshCredential(token: string): Promise<void> {
  await Keychain.setGenericPassword('refresh_token', token, {
    service: 'com.yourapp.auth.refresh',
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function clearStoredCredential(): Promise<void> {
  await Keychain.resetGenericPassword({
    service: 'com.yourapp.auth.refresh',
  });
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Try to refresh using stored credential
    const refreshToken = await getStoredRefreshCredential();
    if (!refreshToken) {
      throw new Error('UNAUTHENTICATED');
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!refreshResponse.ok) {
      await clearStoredCredential();
      accessToken = null;
      throw new Error('UNAUTHENTICATED');
    }

    const refreshData = await refreshResponse.json();
    accessToken = refreshData.access_token;
    await storeRefreshCredential(refreshData.refresh_token);

    headers.Authorization = `Bearer ${accessToken}`;
    response = await fetch(url, { ...options, headers });
  }

  return response;
}

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await fetchWithAuth(SUBSCRIPTION_ENDPOINT, {
    method: 'GET',
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Server returns 404 for resources the session does not own
      throw new Error('NOT_FOUND');
    }
    throw new Error('FETCH_FAILED');
  }

  const data = await response.json();

  // Validate server response shape
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof data.isPro !== 'boolean' ||
    typeof data.plan !== 'string' ||
    (data.expiresAt !== null && typeof data.expiresAt !== 'string')
  ) {
    throw new Error('INVALID_RESPONSE');
  }

  return {
    isPro: data.isPro,
    expiresAt: data.expiresAt,
    plan: data.plan,
  };
}

export function useProSubscription(): SubscriptionState {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await fetchSubscriptionStatus();
      setIsPro(status.isPro);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
      setError(message);
      setIsPro(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isLoading, isPro, error, refresh };
}

/**
 * Usage:
 *
 * function PremiumFeature() {
 *   const { isLoading, isPro, error, refresh } = useProSubscription();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorView message={error} onRetry={refresh} />;
 *   if (!isPro) return <UpgradePrompt />;
 *
 *   return <PremiumContent />;
 * }
 */