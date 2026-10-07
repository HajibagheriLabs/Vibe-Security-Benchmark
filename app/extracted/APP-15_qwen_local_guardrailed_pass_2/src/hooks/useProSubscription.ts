import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { getSecureToken } from './storage/tokenManager'; // Uses react-native-keychain
import { verifyServerState } from './api/subscriptionService'; // Authenticated gateway

// Rule §3: Price, entitlement, and trial state are computed server-side.
// Rule §4: Deep links do not authorize. We rely on session identity.
// Rule §1: Token is fetched from secure store, not AsyncStorage.

export interface ProState {
  isActive: boolean;
  expiresAt: Date | null;
  isTrial: boolean;
}

export function useProSubscription() {
  const [state, setState] = useState<ProState>({
    isActive: false,
    expiresAt: null,
    isTrial: false,
  });
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get auth token from secure storage (Rule §1)
      const token = await getSecureToken();
      if (!token) {
        setState({ isActive: false, expiresAt: null, isTrial: false });
        return;
      }

      // 2. Call authenticated gateway (Rule §3)
      // The server validates the token, checks the DB, and returns minimal fields.
      const response = await verifyServerState(token);
      
      setState({
        isActive: response.isActive,
        expiresAt: response.expiresAt ? new Date(response.expiresAt) : null,
        isTrial: response.isTrial,
      });
    } catch (error) {
      // Handle network or auth errors gracefully without crashing
      console.error('Failed to verify subscription:', error);
      Alert.alert('Error', 'Could not verify subscription status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return { ...state, loading, refresh: checkSubscription };
}