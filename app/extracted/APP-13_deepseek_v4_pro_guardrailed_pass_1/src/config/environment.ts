// src/config/environment.ts

// API base URL - must be HTTPS, never HTTP
export const API_BASE_URL = 'https://api.yourdomain.com';

// Environment validation
if (__DEV__) {
  // Development environment - still requires HTTPS
  // Never use HTTP even in development
  console.assert(
    API_BASE_URL.startsWith('https://'),
    'API_BASE_URL must use HTTPS'
  );
}