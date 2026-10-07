// src/services/subscriptionService.ts
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

// Security note: Subscription state is verified server-side, never trusted from client storage.
// The device only caches the entitlement for offline UX; the server remains the source of truth.

interface SubscriptionStatus {
  isPro: boolean;
  expiresAt: string | null;
  tier: 'free' | 'pro';
}

interface ServerSubscriptionResponse {
  isPro: boolean;
  expiresAt: string | null;
  tier: 'free' | 'pro';
}

const SUBSCRIPTION_CACHE_KEY = 'pro_subscription_status';
const SUBSCRIPTION_CACHE_SERVICE = 'com.yourapp.subscription';

// Security note: Secure storage with device-only accessibility, never AsyncStorage.
const keychainOptions: Keychain.Options = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  service: SUBSCRIPTION_CACHE_SERVICE,
};

export class SubscriptionService {
  private static instance: SubscriptionService;
  private cachedStatus: SubscriptionStatus | null = null;
  private refreshPromise: Promise<SubscriptionStatus> | null = null;

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Checks if the user has an active Pro subscription.
   * Always verifies with the server; local cache is only for offline fallback.
   */
  async hasActiveProSubscription(): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus();
      return status.isPro && this.isSubscriptionValid(status);
    } catch (error) {
      // Security note: Fail closed - no subscription access on error.
      console.error('Failed to verify subscription:', error);
      return false;
    }
  }

  /**
   * Gets the full subscription status with server verification.
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    // Return cached status if fresh (less than 5 minutes old)
    if (this.cachedStatus && this.isCacheFresh()) {
      return this.cachedStatus;
    }

    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshSubscriptionStatus();
    
    try {
      const status = await this.refreshPromise;
      this.cachedStatus = status;
      return status;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Unlocks premium features if subscription is active.
   * Returns a feature gate function that checks subscription status.
   */
  async unlockPremiumFeatures(): Promise<{
    canAccessPremium: boolean;
    subscriptionTier: 'free' | 'pro';
  }> {
    const status = await this.getSubscriptionStatus();
    
    return {
      canAccessPremium: status.isPro && this.isSubscriptionValid(status),
      subscriptionTier: status.isPro ? 'pro' : 'free',
    };
  }

  /**
   * Refreshes subscription status from the server.
   * Security note: Server is the authoritative source; client cache is never trusted alone.
   */
  private async refreshSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const serverStatus = await this.fetchSubscriptionFromServer();
      
      // Cache the server response in secure storage for offline access
      await this.cacheSubscriptionStatus(serverStatus);
      
      return serverStatus;
    } catch (error) {
      // Network error - fall back to cached status if available
      const cachedStatus = await this.getCachedSubscriptionStatus();
      if (cachedStatus) {
        return cachedStatus;
      }
      
      // No cache available - fail closed
      return {
        isPro: false,
        expiresAt: null,
        tier: 'free',
      };
    }
  }

  /**
   * Fetches subscription status from our backend server.
   * Security note: The server authenticates the user and verifies the subscription
   * with the app store. Never trust client-side receipt validation.
   */
  private async fetchSubscriptionFromServer(): Promise<ServerSubscriptionResponse> {
    // Security note: This endpoint requires authentication and validates the subscription
    // server-side. The app never sends or validates receipts directly.
    const response = await fetch('https://api.yourapp.com/v1/subscription/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Subscription check failed: ${response.status}`);
    }

    const data: ServerSubscriptionResponse = await response.json();
    
    // Validate server response shape
    if (typeof data.isPro !== 'boolean' || !['free', 'pro'].includes(data.tier)) {
      throw new Error('Invalid subscription response from server');
    }

    return data;
  }

  /**
   * Gets the access token from memory or secure storage.
   * Security note: Access tokens stay in memory; only refresh tokens are persisted.
   */
  private async getAccessToken(): Promise<string> {
    // This would be implemented by your auth service
    // Access token should be held in memory, not persisted
    throw new Error('Access token not available - user must be authenticated');
  }

  /**
   * Caches subscription status in secure storage.
   * Security note: Uses Keychain/Keystore with device-only accessibility.
   */
  private async cacheSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
    try {
      await Keychain.setGenericPassword(
        SUBSCRIPTION_CACHE_KEY,
        JSON.stringify(status),
        keychainOptions
      );
    } catch (error) {
      // Security note: Cache failure should not block subscription access
      console.warn('Failed to cache subscription status:', error);
    }
  }

  /**
   * Retrieves cached subscription status from secure storage.
   */
  private async getCachedSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    try {
      const credentials = await Keychain.getGenericPassword(keychainOptions);
      if (credentials && credentials.password) {
        const parsed = JSON.parse(credentials.password) as SubscriptionStatus;
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to retrieve cached subscription:', error);
    }
    return null;
  }

  /**
   * Validates that the subscription hasn't expired.
   */
  private isSubscriptionValid(status: SubscriptionStatus): boolean {
    if (!status.isPro || !status.expiresAt) {
      return false;
    }

    const expiryDate = new Date(status.expiresAt);
    const now = new Date();
    
    // Add a small buffer to account for clock skew
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return expiryDate.getTime() > (now.getTime() + bufferMs);
  }

  /**
   * Checks if the cached status is still fresh.
   */
  private isCacheFresh(): boolean {
    // Cache is considered fresh for 5 minutes
    const CACHE_TTL_MS = 5 * 60 * 1000;
    return Date.now() - this.getLastCacheTime() < CACHE_TTL_MS;
  }

  private lastCacheTime: number = 0;

  private getLastCacheTime(): number {
    return this.lastCacheTime;
  }

  /**
   * Clears cached subscription status (e.g., on logout).
   * Security note: Wipe secure storage on logout.
   */
  async clearSubscriptionCache(): Promise<void> {
    this.cachedStatus = null;
    this.lastCacheTime = 0;
    
    try {
      await Keychain.resetGenericPassword(keychainOptions);
    } catch (error) {
      console.warn('Failed to clear subscription cache:', error);
    }
  }
}

// Export a singleton instance for convenience
export const subscriptionService = SubscriptionService.getInstance();