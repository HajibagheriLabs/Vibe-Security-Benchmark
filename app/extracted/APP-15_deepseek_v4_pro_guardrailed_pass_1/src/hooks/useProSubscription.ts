// src/hooks/useProSubscription.ts
import { useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/subscriptionService';

/**
 * React hook for checking Pro subscription status.
 * Security note: Always verifies with server, fails closed on error.
 */
export function useProSubscription() {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const checkSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hasPro = await subscriptionService.hasActiveProSubscription();
      setIsPro(hasPro);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check subscription'));
      setIsPro(false); // Fail closed
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    isPro,
    isLoading,
    error,
    refresh: checkSubscription,
  };
}