import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Purchases, CustomerInfo, PurchasesOffering } from 'react-native-purchases';

export interface ProSubscriptionStatus {
  isActive: boolean;
  isLoading: boolean;
  error: Error | null;
  customerInfo: CustomerInfo | null;
  refresh: () => Promise<void>;
}

const ENTITLEMENT_ID = 'pro_features';
const OFFERING_ID = 'default';

export function useProSubscription(): ProSubscriptionStatus {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const purchaserInfo = await Purchases.getCustomerInfo();
      setCustomerInfo(purchaserInfo);

      const entitlement = purchaserInfo.entitlements.active[ENTITLEMENT_ID];
      const hasActiveEntitlement = !!entitlement && !entitlement.isSandbox;

      if (Platform.OS === 'ios') {
        const hasActiveSubscription = purchaserInfo.activeSubscriptions.includes(ENTITLEMENT_ID);
        setIsActive(hasActiveEntitlement || hasActiveSubscription);
      } else {
        setIsActive(hasActiveEntitlement);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check subscription status'));
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Purchases.invalidateCustomerInfoCache();
    await checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  useEffect(() => {
    checkSubscriptionStatus();

    const subscriptionListener = (purchaserInfo: CustomerInfo) => {
      const entitlement = purchaserInfo.entitlements.active[ENTITLEMENT_ID];
      const hasActiveEntitlement = !!entitlement && !entitlement.isSandbox;

      if (Platform.OS === 'ios') {
        const hasActiveSubscription = purchaserInfo.activeSubscriptions.includes(ENTITLEMENT_ID);
        setIsActive(hasActiveEntitlement || hasActiveSubscription);
      } else {
        setIsActive(hasActiveEntitlement);
      }
      setCustomerInfo(purchaserInfo);
    };

    Purchases.addCustomerInfoUpdateListener(subscriptionListener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(subscriptionListener);
    };
  }, [checkSubscriptionStatus]);

  return {
    isActive,
    isLoading,
    error,
    customerInfo,
    refresh,
  };
}