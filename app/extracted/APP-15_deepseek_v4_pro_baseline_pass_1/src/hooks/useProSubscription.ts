import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { getItem, setItem } from '../utils/storage';

const PRO_ENTITLEMENT_ID = 'pro_subscription';
const CACHE_KEY = '@pro_subscription_active';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

interface ProSubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Checks whether the user has an active Pro subscription and unlocks premium features.
 * Uses RevenueCat for cross-platform subscription management with local caching.
 */
export function useProSubscription(): ProSubscriptionState {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkProSubscription = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Check local cache first for instant UI response
      const cached = await getItem<{ isPro: boolean; timestamp: number }>(CACHE_KEY);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setIsPro(cached.isPro);
        setIsLoading(false);
        return;
      }

      // 2. Fetch fresh customer info from RevenueCat
      const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();

      // 3. Check if the user has the Pro entitlement active
      const entitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
      const hasActivePro = entitlement !== undefined && entitlement.isActive;

      // 4. Update state and cache
      setIsPro(hasActivePro);
      await setItem(CACHE_KEY, {
        isPro: hasActivePro,
        timestamp: Date.now(),
      });

      // 5. Optionally sync with your backend for server-side validation
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await syncSubscriptionStatusWithBackend(hasActivePro);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check subscription status';
      setError(errorMessage);
      console.error('[useProSubscription] Error checking subscription:', err);

      // Fallback: try to use stale cache if available
      const staleCache = await getItem<{ isPro: boolean; timestamp: number }>(CACHE_KEY);
      if (staleCache) {
        setIsPro(staleCache.isPro);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkProSubscription();

    // Listen for subscription changes (e.g., user upgrades/downgrades)
    const unsubscribe = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      const entitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
      const hasActivePro = entitlement !== undefined && entitlement.isActive;
      setIsPro(hasActivePro);
      setItem(CACHE_KEY, { isPro: hasActivePro, timestamp: Date.now() }).catch(() => {
        // Silently fail cache update
      });
    });

    return () => {
      unsubscribe();
    };
  }, [checkProSubscription]);

  return {
    isPro,
    isLoading,
    error,
    refresh: checkProSubscription,
  };
}

/**
 * Syncs subscription status with your backend for server-side validation.
 * This is important for security-critical premium features.
 */
async function syncSubscriptionStatusWithBackend(isPro: boolean): Promise<void> {
  try {
    // Replace with your actual backend endpoint
    const response = await fetch('https://api.yourapp.com/v1/subscription/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isPro }),
    });

    if (!response.ok) {
      console.warn('[useProSubscription] Backend sync failed:', response.status);
    }
  } catch (error) {
    console.warn('[useProSubscription] Backend sync error:', error);
  }
}