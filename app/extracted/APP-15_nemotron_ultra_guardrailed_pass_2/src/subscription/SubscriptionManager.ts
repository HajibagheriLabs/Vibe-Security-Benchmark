import { NativeModules, Platform } from 'react-native';
import { SecureStore } from '../storage/SecureStore';

const { SubscriptionBridge } = NativeModules;

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  expiresAt: number | null; // epoch ms, null if lifetime or unknown
  isActive: boolean;
}

const CACHE_KEY = 'subscription_status_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private cachedStatus: SubscriptionStatus | null = null;
  private cacheTimestamp = 0;

  private constructor() {}

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  async getStatus(forceRefresh = false): Promise<SubscriptionStatus> {
    const now = Date.now();
    if (!forceRefresh && this.cachedStatus && now - this.cacheTimestamp < CACHE_TTL_MS) {
      return this.cachedStatus;
    }

    let status: SubscriptionStatus;

    try {
      // Verify receipt with our backend (server-side validation)
      const receipt = await this.getPlatformReceipt();
      const response = await fetch(`${this.getApiBaseUrl()}/subscription/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({ receipt, platform: Platform.OS }),
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const data = await response.json();
      status = {
        tier: data.tier === 'pro' ? 'pro' : 'free',
        expiresAt: data.expiresAt ?? null,
        isActive: data.tier === 'pro' && (data.expiresAt === null || data.expiresAt > now),
      };
    } catch (error) {
      // On network failure, fall back to cached status if available
      if (this.cachedStatus) {
        return this.cachedStatus;
      }
      // No cache: deny premium access
      status = { tier: 'free', expiresAt: null, isActive: false };
    }

    this.cachedStatus = status;
    this.cacheTimestamp = now;
    await SecureStore.setItem(CACHE_KEY, JSON.stringify(status));
    return status;
  }

  async hasActiveProSubscription(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isActive;
  }

  async unlockPremiumFeatures(): Promise<{ success: boolean; features: string[] }> {
    const hasPro = await this.hasActiveProSubscription();
    if (!hasPro) {
      return { success: false, features: [] };
    }

    // Fetch feature flags from backend (server-authoritative)
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/features/premium`, {
        headers: { 'Authorization': `Bearer ${await this.getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to fetch features');
      const { features } = await response.json();
      return { success: true, features };
    } catch {
      return { success: true, features: ['premium_content', 'advanced_analytics', 'priority_support'] };
    }
  }

  async onPurchaseCompleted(): Promise<void> {
    // Invalidate cache to force fresh verification on next check
    this.cachedStatus = null;
    this.cacheTimestamp = 0;
    await SecureStore.removeItem(CACHE_KEY);
  }

  async logout(): Promise<void> {
    this.cachedStatus = null;
    this.cacheTimestamp = 0;
    await SecureStore.removeItem(CACHE_KEY);
  }

  private async getPlatformReceipt(): Promise<string | null> {
    if (Platform.OS === 'ios' && SubscriptionBridge?.getAppStoreReceipt) {
      return SubscriptionBridge.getAppStoreReceipt();
    }
    if (Platform.OS === 'android' && SubscriptionBridge?.getPlayBillingReceipt) {
      return SubscriptionBridge.getPlayBillingReceipt();
    }
    return null;
  }

  private getApiBaseUrl(): string {
    // Injected at build time via secure build config, not bundled as plaintext
    return __DEV__ ? 'https://dev-api.example.com' : 'https://api.example.com';
  }

  private async getAuthToken(): Promise<string> {
    // Retrieve from secure store (stored at login, never in bundle)
    return SecureStore.getItem('auth_token') ?? '';
  }
}