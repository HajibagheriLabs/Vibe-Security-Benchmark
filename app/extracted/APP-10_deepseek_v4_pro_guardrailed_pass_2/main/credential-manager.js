// main/credential-manager.js
'use strict';

/**
 * High-level credential manager that integrates with the secure store.
 * 
 * SECURITY DECISIONS:
 * - Access tokens kept in memory only, never persisted
 * - Refresh credential rotation on each use
 * - Automatic wipe on logout
 */

const secureStore = require('./secure-credential-store');

class CredentialManager {
  constructor() {
    this._accessToken = null;
    this._refreshToken = null;
    this._userId = null;
    this._tokenExpiry = null;
  }

  /**
   * Initialize from persisted credentials on app startup.
   */
  async initialize() {
    const stored = secureStore.loadCredentials();
    if (stored) {
      this._refreshToken = stored.refreshToken;
      this._userId = stored.userId;
      // Access token will be fetched fresh via refresh flow
      this._accessToken = null;
      return true;
    }
    return false;
  }

  /**
   * Set credentials after successful authentication.
   * @param {Object} authResult - { accessToken, refreshToken, userId, expiresIn }
   */
  async setCredentials(authResult) {
    this._accessToken = authResult.accessToken;
    this._refreshToken = authResult.refreshToken;
    this._userId = authResult.userId;
    this._tokenExpiry = Date.now() + (authResult.expiresIn * 1000);

    // Persist only the refresh credential
    await secureStore.saveCredentials({
      refreshToken: authResult.refreshToken,
      userId: authResult.userId
    });
  }

  /**
   * Get current access token, refreshing if necessary.
   * @returns {Promise<string>} - Valid access token
   */
  async getAccessToken() {
    if (!this._accessToken || this._isTokenExpired()) {
      await this._refreshAccessToken();
    }
    return this._accessToken;
  }

  /**
   * Get current user ID.
   * @returns {string|null}
   */
  getUserId() {
    return this._userId;
  }

  /**
   * Check if user is authenticated.
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this._refreshToken;
  }

  /**
   * Clear all credentials (logout).
   */
  async logout() {
    this._accessToken = null;
    this._refreshToken = null;
    this._userId = null;
    this._tokenExpiry = null;
    secureStore.clearCredentials();
  }

  _isTokenExpired() {
    return this._tokenExpiry && Date.now() >= this._tokenExpiry;
  }

  async _refreshAccessToken() {
    if (!this._refreshToken) {
      throw new Error('No refresh token available');
    }

    // This would call your authentication server
    // The refresh token rotation should happen server-side
    // and return a new refresh token to replace the old one
    throw new Error('Refresh token flow must be implemented with your auth server');
  }
}

module.exports = new CredentialManager();