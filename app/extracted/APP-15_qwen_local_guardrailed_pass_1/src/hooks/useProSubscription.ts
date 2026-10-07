import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Rule 1: Sensitive persistence uses only expo-secure-store (device-only, encrypted).
// Rule 3: Gateway order: authenticate -> authorize -> validate -> return minimal fields.
// We assume an API endpoint that returns a verified boolean.

interface ProSubscriptionState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
}

const SUBSCRIPTION_KEY = 'pro_subscription_token';

export function useProSubscription() {
  const [state, setState] = useState<ProSubscriptionState>({
    isActive: false,
    isLoading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Retrieve local token (refresh credential)
      const token = await SecureStore.getItemAsync(SUBSCRIPTION_KEY);
      
      if (!token) {
        setState({ isActive: false, isLoading: false, error: null });
        return;
      }

      // 2. Validate against server (Rule 3: Gateway)
      // We assume a secure API endpoint: GET /api/subscription/status
      // The server validates the token and returns { active: boolean }
      const response = await fetch('https://api.example.com/subscription/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Subscription check failed: ${response.status}`);
      }

      const data = await response.json();
      
      // 3. Validate schema
      if (typeof data.active !== 'boolean') {
        throw new Error('Invalid subscription response');
      }

      setState({
        isActive: data.active,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState({
        isActive: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    ...state,
    refresh: checkSubscription,
  };
}