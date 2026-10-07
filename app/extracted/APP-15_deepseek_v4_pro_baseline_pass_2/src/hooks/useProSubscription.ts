import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRO_ENTITLEMENT_ID = 'pro_subscription';
const CACHE_KEY = '@pro_subscription_active';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  customerInfo: CustomerInfo | null;
  refreshSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

interface CachedSubscription {
  isPro: boolean;
  timestamp: number;
}

/**
 * Hook that checks whether the user has an active Pro subscription
 * and unlocks premium features accordingly.
 */
export function useProSubscription(): SubscriptionState {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkSubscription = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first for instant response
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedSubscription = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          setIsPro(parsed.isPro);
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh customer info from RevenueCat
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      const hasPro = typeof info.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
      setIsPro(hasPro);

      // Cache the result
      const cacheData: CachedSubscription = {
        isPro: hasPro,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check subscription status';
      setError(message);
      setIsPro(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await Purchases.restorePurchases();
      await checkSubscription();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore purchases';
      setError(message);
      setIsLoading(false);
    }
  }, [checkSubscription]);

  useEffect(() => {
    // Configure RevenueCat on mount
    const configureRevenueCat = async (): Promise<void> => {
      try {
        if (Platform.OS === 'ios') {
          await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_IOS_API_KEY' });
        } else if (Platform.OS === 'android') {
          await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_ANDROID_API_KEY' });
        }
        await checkSubscription();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to configure RevenueCat';
        setError(message);
        setIsLoading(false);
      }
    };

    configureRevenueCat();
  }, [checkSubscription]);

  return {
    isPro,
    isLoading,
    error,
    customerInfo,
    refreshSubscription: checkSubscription,
    restorePurchases,
  };
}

/**
 * Utility function to check Pro subscription status without using the hook.
 * Useful for non-component contexts or imperative checks.
 */
export async function checkProSubscriptionStatus(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return typeof info.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Utility function to unlock premium features based on subscription status.
 * Returns a set of feature flags that can be used to conditionally render UI.
 */
export function getPremiumFeatures(isPro: boolean): Record<string, boolean> {
  return {
    canAccessPremiumContent: isPro,
    canUseAdvancedFilters: isPro,
    canExportData: isPro,
    canUseOfflineMode: isPro,
    canAccessAnalytics: isPro,
    canRemoveAds: isPro,
    canUseCustomThemes: isPro,
    canAccessPrioritySupport: isPro,
  };
}