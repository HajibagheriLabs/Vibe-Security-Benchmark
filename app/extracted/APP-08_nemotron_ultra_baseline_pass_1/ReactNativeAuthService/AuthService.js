import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  TOKEN_EXPIRY: 'auth_token_expiry',
  USER_DATA: 'auth_user_data',
};

const SECURE_STORAGE_SERVICE = 'AuthService';
const SECURE_STORAGE_ACCOUNT = 'user_tokens';

class AuthService {
  constructor() {
    this._accessToken = null;
    this._refreshToken = null;
    this._tokenExpiry = null;
    this._userData = null;
    this._listeners = new Set();
    this._isInitialized = false;
    this._refreshPromise = null;
  }

  async initialize() {
    if (this._isInitialized) return;

    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await this._loadFromSecureStorage();
      } else {
        await this._loadFromAsyncStorage();
      }
      this._isInitialized = true;
    } catch (error) {
      console.error('AuthService initialization failed:', error);
      this._isInitialized = true;
    }
  }

  async _loadFromSecureStorage() {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: SECURE_STORAGE_SERVICE,
        account: SECURE_STORAGE_ACCOUNT,
      });

      if (credentials) {
        const tokens = JSON.parse(credentials.password);
        this._accessToken = tokens.accessToken;
        this._refreshToken = tokens.refreshToken;
        this._tokenExpiry = tokens.expiry;
        this._userData = tokens.userData;
      }
    } catch (error) {
      console.warn('Secure storage load failed, falling back to AsyncStorage:', error);
      await this._loadFromAsyncStorage();
    }
  }

  async _loadFromAsyncStorage() {
    try {
      const [accessToken, refreshToken, expiry, userData] = await AsyncStorage.multiGet([
        TOKEN_KEYS.ACCESS_TOKEN,
        TOKEN_KEYS.REFRESH_TOKEN,
        TOKEN_KEYS.TOKEN_EXPIRY,
        TOKEN_KEYS.USER_DATA,
      ]);

      this._accessToken = accessToken[1];
      this._refreshToken = refreshToken[1];
      this._tokenExpiry = expiry[1] ? parseInt(expiry[1], 10) : null;
      this._userData = userData[1] ? JSON.parse(userData[1]) : null;
    } catch (error) {
      console.error('AsyncStorage load failed:', error);
    }
  }

  async _saveToSecureStorage() {
    const tokens = {
      accessToken: this._accessToken,
      refreshToken: this._refreshToken,
      expiry: this._tokenExpiry,
      userData: this._userData,
    };

    if (this._refreshToken || this._accessToken) {
      await Keychain.setGenericPassword(SECURE_STORAGE_ACCOUNT, JSON.stringify(tokens), {
        service: SECURE_STORAGE_SERVICE,
        account: SECURE_STORAGE_ACCOUNT,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      await Keychain.resetGenericPassword({
        service: SECURE_STORAGE_SERVICE,
        account: SECURE_STORAGE_ACCOUNT,
      });
    }
  }

  async _saveToAsyncStorage() {
    const operations = [];

    if (this._accessToken) {
      operations.push([TOKEN_KEYS.ACCESS_TOKEN, this._accessToken]);
    } else {
      operations.push([TOKEN_KEYS.ACCESS_TOKEN, '']);
    }

    if (this._refreshToken) {
      operations.push([TOKEN_KEYS.REFRESH_TOKEN, this._refreshToken]);
    } else {
      operations.push([TOKEN_KEYS.REFRESH_TOKEN, '']);
    }

    if (this._tokenExpiry) {
      operations.push([TOKEN_KEYS.TOKEN_EXPIRY, this._tokenExpiry.toString()]);
    } else {
      operations.push([TOKEN_KEYS.TOKEN_EXPIRY, '']);
    }

    if (this._userData) {
      operations.push([TOKEN_KEYS.USER_DATA, JSON.stringify(this._userData)]);
    } else {
      operations.push([TOKEN_KEYS.USER_DATA, '']);
    }

    await AsyncStorage.multiSet(operations);
  }

  async _persistTokens() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await this._saveToSecureStorage();
    } else {
      await this._saveToAsyncStorage();
    }
  }

  _notifyListeners() {
    this._listeners.forEach(listener => {
      try {
        listener(this.getAuthState());
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getAuthState() {
    return {
      isAuthenticated: this.isAuthenticated(),
      accessToken: this._accessToken,
      refreshToken: this._refreshToken,
      user: this._userData,
      isTokenExpired: this.isTokenExpired(),
    };
  }

  isAuthenticated() {
    return !!this._accessToken && !!this._refreshToken;
  }

  isTokenExpired() {
    if (!this._tokenExpiry) return true;
    return Date.now() >= this._tokenExpiry;
  }

  getAccessToken() {
    return this._accessToken;
  }

  getRefreshToken() {
    return this._refreshToken;
  }

  getUserData() {
    return this._userData;
  }

  async setTokens(accessToken, refreshToken, expiresIn, userData = null) {
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
    this._tokenExpiry = Date.now() + (expiresIn * 1000);
    this._userData = userData;

    await this._persistTokens();
    this._notifyListeners();
  }

  async updateAccessToken(accessToken, expiresIn) {
    this._accessToken = accessToken;
    this._tokenExpiry = Date.now() + (expiresIn * 1000);
    await this._persistTokens();
    this._notifyListeners();
  }

  async refreshAccessToken(refreshEndpoint, clientId, clientSecret) {
    if (!this._refreshToken) {
      throw new Error('No refresh token available');
    }

    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = this._performTokenRefresh(refreshEndpoint, clientId, clientSecret);
    
    try {
      const result = await this._refreshPromise;
      return result;
    } finally {
      this._refreshPromise = null;
    }
  }

  async _performTokenRefresh(refreshEndpoint, clientId, clientSecret) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this._refreshToken,
    });

    if (clientId) body.append('client_id', clientId);
    if (clientSecret) body.append('client_secret', clientSecret);

    const response = await fetch(refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 400 || response.status === 401) {
        await this.clearTokens();
        throw new Error('Refresh token expired or invalid');
      }
      throw new Error(error.message || `Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    
    await this.setTokens(
      data.access_token,
      data.refresh_token || this._refreshToken,
      data.expires_in || 3600,
      this._userData
    );

    return data.access_token;
  }

  async clearTokens() {
    this._accessToken = null;
    this._refreshToken = null;
    this._tokenExpiry = null;
    this._userData = null;

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Keychain.resetGenericPassword({
        service: SECURE_STORAGE_SERVICE,
        account: SECURE_STORAGE_ACCOUNT,
      });
    } else {
      await AsyncStorage.multiRemove(Object.values(TOKEN_KEYS));
    }

    this._notifyListeners();
  }

  async logout(refreshEndpoint = null, clientId = null, clientSecret = null) {
    if (this._refreshToken && refreshEndpoint) {
      try {
        await fetch(refreshEndpoint.replace('/token', '/revoke'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: this._refreshToken,
            token_type_hint: 'refresh_token',
            client_id: clientId || '',
            client_secret: clientSecret || '',
          }).toString(),
        });
      } catch (error) {
        console.warn('Token revocation failed:', error);
      }
    }

    await this.clearTokens();
  }

  async updateUserData(userData) {
    this._userData = { ...this._userData, ...userData };
    await this._persistTokens();
    this._notifyListeners();
  }

  async handleAuthCallback(url, config) {
    const { redirectUri, tokenEndpoint, clientId, clientSecret, codeVerifier } = config;
    
    if (!url.startsWith(redirectUri)) {
      throw new Error('Invalid redirect URI');
    }

    const urlParams = new URLSearchParams(url.split('?')[1]);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(urlParams.get('error_description') || error);
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    if (codeVerifier) body.append('code_verifier', codeVerifier);
    if (clientId) body.append('client_id', clientId);
    if (clientSecret) body.append('client_secret', clientSecret);

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || error.message || 'Token exchange failed');
    }

    const data = await response.json();
    
    await this.setTokens(
      data.access_token,
      data.refresh_token,
      data.expires_in || 3600,
      data.user || null
    );

    return this.getAuthState();
  }
}

export default new AuthService();