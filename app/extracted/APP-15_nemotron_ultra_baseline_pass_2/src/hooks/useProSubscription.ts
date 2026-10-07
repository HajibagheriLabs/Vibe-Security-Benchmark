import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Purchases, CustomerInfo, LOG_LEVEL } from 'revenuecat-purchases';

const REVENUECAT_API_KEY = {
  ios: 'appl_YOUR_IOS_API_KEY',
  android: 'goog_YOUR_ANDROID_API_KEY',
};

export type ProStatus = {
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  customerInfo: CustomerInfo | null;
};

export function useProSubscription(): ProStatus {
  const [status, setStatus] = useState<ProStatus>({
    isPro: false,
    isLoading: true,
    error: null,
    customerInfo: null,
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        await Purchases.configure({
          apiKey: Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android,
        });

        const customerInfo = await Purchases.getCustomerInfo();
        if (!mounted) return;

        const isPro = customerInfo.entitlements.active['pro'] !== undefined;
        setStatus({
          isPro,
          isLoading: false,
          error: null,
          customerInfo,
        });
      } catch (e) {
        if (!mounted) return;
        setStatus(s => ({
          ...s,
          isLoading: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        }));
      }
    }

    init();

    const listener = (customerInfo: CustomerInfo) => {
      if (!mounted) return;
      const isPro = customerInfo.entitlements.active['pro'] !== undefined;
      setStatus(s => ({ ...s, isPro, customerInfo }));
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return status;
}