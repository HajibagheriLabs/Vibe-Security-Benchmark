// src/services/apiClient.ts

import axios from 'axios';
import * as Keychain from 'react-native-keychain';

/**
 * API Client for our backend
 * 
 * SECURITY: 
 * - All requests go through HTTPS
 * - Access tokens are stored in memory only
 * - Refresh tokens are stored in Keychain (secure storage)
 * - No API keys or secrets are stored in the app
 */
const API_BASE_URL = 'https://api.yourapp.com'; // HTTPS only

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Access token should be in memory (from auth context)
    // This is a simplified example - actual implementation would use auth context
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh using refresh token from Keychain
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          const refreshToken = credentials.password;
          // Call refresh endpoint
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });
          
          if (response.data.accessToken) {
            // Update in-memory token and retry original request
            error.config.headers.Authorization = `Bearer ${response.data.accessToken}`;
            return apiClient(error.config);
          }
        }
      } catch (refreshError) {
        // Handle refresh failure - redirect to login
      }
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  getOrderDetails: async (orderId: string, accessToken?: string) => {
    const response = await apiClient.get(`/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },

  getPaymentMethods: async (accessToken?: string) => {
    const response = await apiClient.get('/api/payment-methods', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },

  post: apiClient.post,
};