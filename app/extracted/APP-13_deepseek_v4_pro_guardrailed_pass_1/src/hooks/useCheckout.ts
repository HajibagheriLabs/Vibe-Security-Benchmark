// src/hooks/useCheckout.ts

import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/environment';
import type {
  CheckoutSession,
  CreateCheckoutSessionRequest,
  PaymentResult,
} from '../types/checkout';

const SECURE_STORE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export const useCheckout = () => {
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    // Access token kept in memory, refresh token in secure storage
    const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
    
    if (!refreshToken) {
      throw new Error('Authentication required');
    }

    // In production, exchange refresh token for access token via backend
    // Access token should be cached in memory, not stored
    const accessToken = await exchangeRefreshToken(refreshToken);
    
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const createCheckoutSession = useCallback(async (
    request: CreateCheckoutSessionRequest
  ): Promise<CheckoutSession> => {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}/api/checkout/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    return response.json();
  }, [getAuthHeaders]);

  const processPayment = useCallback(async (
    sessionId: string
  ): Promise<PaymentResult> => {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}/api/checkout/process`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment processing failed');
    }

    return response.json();
  }, [getAuthHeaders]);

  const getSessionStatus = useCallback(async (
    sessionId: string
  ): Promise<CheckoutSession | null> => {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}/api/checkout/sessions/${sessionId}`, {
      method: 'GET',
      headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch session status');
    }

    return response.json();
  }, [getAuthHeaders]);

  return {
    createCheckoutSession,
    processPayment,
    getSessionStatus,
  };
};

// Helper function to exchange refresh token for access token
// This should be implemented with proper token rotation
async function exchangeRefreshToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  return data.accessToken;
}