import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import AuthService from '../AuthService';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-keychain');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthService._accessToken = null;
    AuthService._refreshToken = null;
    AuthService._tokenExpiry = null;
    AuthService._userData = null;
    AuthService._isInitialized = false;
  });

  describe('initialize', () => {
    it('loads tokens from Keychain on iOS', async () => {
      const tokens = {
        accessToken: 'access_123',
        refreshToken: 'refresh_123',
        expiry: Date.now() + 3600000,
        userData: { id: '1', name: 'Test User' },
      };
      
      Keychain.getGenericPassword.mockResolvedValue({
        password: JSON.stringify(tokens),
      });

      await AuthService.initialize();

      expect(AuthService.getAccessToken()).toBe('access_123');
      expect(AuthService.getRefreshToken()).toBe('refresh_123');
      expect(AuthService.getUserData()).toEqual({ id: '1', name: 'Test User' });
    });

    it('falls back to AsyncStorage when Keychain fails', async () => {
      Keychain.getGenericPassword.mockRejectedValue(new Error('Keychain unavailable'));
      
      AsyncStorage.multiGet.mockResolvedValue([
        ['auth_access_token', 'access_456'],
        ['auth_refresh_token', 'refresh_456'],
        ['auth_token_expiry', (Date.now() + 3600000).toString()],
        ['auth_user_data', JSON.stringify({ id: '2', name: 'Fallback User' })],
      ]);

      await AuthService.initialize();

      expect(AuthService.getAccessToken()).toBe('access_456');
      expect(AsyncStorage.multiGet).toHaveBeenCalled();
    });
  });

  describe('setTokens', () => {
    it('saves tokens and notifies listeners', async () => {
      const listener = jest.fn();
      AuthService.subscribe(listener);

      await AuthService.setTokens('new_access', 'new_refresh', 3600, { id: '3' });

      expect(AuthService.getAccessToken()).toBe('new_access');
      expect(AuthService.getRefreshToken()).toBe('new_refresh');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        isAuthenticated: true,
        accessToken: 'new_access',
      }));
    });

    it('persists to Keychain on mobile platforms', async () => {
      await AuthService.setTokens('access_789', 'refresh_789', 3600);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'user_tokens',
        expect.stringContaining('access_789'),
        expect.objectContaining({ service: 'AuthService' })
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('refreshes token successfully', async () => {
      AuthService._refreshToken = 'valid_refresh';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 7200,
        }),
      });

      const token = await AuthService.refreshAccessToken('https://auth.example.com/token', 'client_id', 'secret');

      expect(token).toBe('new_access_token');
      expect(AuthService.getAccessToken()).toBe('new_access_token');
      expect(AuthService.getRefreshToken()).toBe('new_refresh_token');
    });

    it('clears tokens on refresh failure', async () => {
      AuthService._refreshToken = 'expired_refresh';
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      });

      await expect(AuthService.refreshAccessToken('https://auth.example.com/token'))
        .rejects.toThrow('Refresh token expired or invalid');

      expect(AuthService.getAccessToken()).toBeNull();
      expect(AuthService.getRefreshToken()).toBeNull();
    });

    it('deduplicates concurrent refresh calls', async () => {
      AuthService._refreshToken = 'valid_refresh';
      
      let resolveFetch;
      global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => {
        resolveFetch = resolve;
      }));

      const promise1 = AuthService.refreshAccessToken('https://auth.example.com/token');
      const promise2 = AuthService.refreshAccessToken('https://auth.example.com/token');

      resolveFetch({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new_access',
          expires_in: 3600,
        }),
      });

      await Promise.all([promise1, promise2]);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearTokens', () => {
    it('clears all tokens and storage', async () => {
      AuthService._accessToken = 'access';
      AuthService._refreshToken = 'refresh';
      AuthService._userData = { id: '1' };

      await AuthService.clearTokens();

      expect(AuthService.getAccessToken()).toBeNull();
      expect(AuthService.getRefreshToken()).toBeNull();
      expect(Keychain.resetGenericPassword).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes token and clears local storage', async () => {
      AuthService._refreshToken = 'refresh_to_revoke';
      
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await AuthService.logout('https://auth.example.com/revoke', 'client_id', 'secret');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://auth.example.com/revoke',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('refresh_to_revoke'),
        })
      );
      expect(AuthService.getRefreshToken()).toBeNull();
    });
  });

  describe('handleAuthCallback', () => {
    it('exchanges code for tokens', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'callback_access',
          refresh_token: 'callback_refresh',
          expires_in: 3600,
          user: { id: '4', email: 'user@example.com' },
        }),
      });

      const state = await AuthService.handleAuthCallback(
        'myapp://callback?code=auth_code_123',
        {
          redirectUri: 'myapp://callback',
          tokenEndpoint: 'https://auth.example.com/token',
          clientId: 'client_id',
          clientSecret: 'secret',
        }
      );

      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('callback_access');
      expect(state.user).toEqual({ id: '4', email: 'user@example.com' });
    });

    it('throws on error response', async () => {
      await expect(AuthService.handleAuthCallback(
        'myapp://callback?error=access_denied&error_description=User%20denied',
        { redirectUri: 'myapp://callback', tokenEndpoint: 'https://auth.example.com/token' }
      )).rejects.toThrow('User denied');
    });
  });
});