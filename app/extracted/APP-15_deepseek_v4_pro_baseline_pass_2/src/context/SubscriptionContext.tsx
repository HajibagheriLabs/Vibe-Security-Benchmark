import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useProSubscription } from '../hooks/useProSubscription';
import { getPremiumFeatures } from '../hooks/useProSubscription';

interface SubscriptionContextValue {
  isPro: boolean;
  isLoading: boolean;
  error: string | null;
  premiumFeatures: Record<string, boolean>;
  refreshSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

/**
 * Context provider that makes subscription state available throughout the app.
 * Wrap your app with this provider to access Pro subscription status anywhere.
 */
export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const {
    isPro,
    isLoading,
    error,
    refreshSubscription,
    restorePurchases,
  } = useProSubscription();

  const premiumFeatures = useMemo(() => getPremiumFeatures(isPro), [isPro]);

  const value = useMemo(
    () => ({
      isPro,
      isLoading,
      error,
      premiumFeatures,
      refreshSubscription,
      restorePurchases,
    }),
    [isPro, isLoading, error, premiumFeatures, refreshSubscription, restorePurchases]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

/**
 * Hook to access subscription state from any component within the provider.
 */
export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}