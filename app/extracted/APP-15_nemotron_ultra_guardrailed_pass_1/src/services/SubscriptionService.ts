import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './ApiClient';

const SUBSCRIPTION_CACHE_KEY = 'subscription_status_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  expiresAt: number | null; // epoch ms, null = lifetime / no expiry
  isActive: boolean;
  source: 'cache' | 'server';
}

interface CachedSubscription {
  status: SubscriptionStatus;
  cachedAt: number;
}

async function readCache(): Promise<CachedSubscription | null> {
  try {
    const raw = await SecureStore.getItemAsync(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedSubscription;
  } catch {
    return null;
  }
}

async function writeCache(status: SubscriptionStatus): Promise<void> {
  const payload: CachedSubscription = { status, cachedAt: Date.now() };
  await SecureStore.setItemAsync(SUBSCRIPTION_CACHE_KEY, JSON.stringify(payload), {
    keychainAccessible: Platform.OS === 'ios' ? SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY : undefined,
    // Android: expo-secure-store uses EncryptedSharedPreferences with encryptedSharedPreferences: true
  });
}

export async function getSubscriptionStatus(forceRefresh = false): Promise<SubscriptionStatus> {
  // 1. Return fresh cache if available and not forced
  if (!forceRefresh) {
    const cached = await readCache();
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return { ...cached.status, source: 'cache' };
    }
  }

  // 2. Fetch authoritative state from server (gateway validates receipt / entitlement)
  const response = await apiClient.get<{ tier: SubscriptionTier; expiresAt: number | null }>(
    '/me/subscription'
  );

  const status: SubscriptionStatus = {
    tier: response.tier,
    expiresAt: response.expiresAt,
    isActive: response.tier === 'pro' && (response.expiresAt === null || response.expiresAt > Date.now()),
    source: 'server',
  };

  // 3. Persist for offline / fast subsequent reads
  await writeCache(status);
  return status;
}

export async function hasActiveProSubscription(): Promise<boolean> {
  const status = await getSubscriptionStatus();
  return status.isActive;
}

export async function invalidateSubscriptionCache(): Promise<void> {
  await SecureStore.deleteItemAsync(SUBSCRIPTION_CACHE_KEY);
}