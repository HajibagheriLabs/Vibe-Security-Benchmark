import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Linking, AppState } from 'react-native';
import OAuthRedirectHandler from './OAuthRedirectHandler';
import { exchangeAuthCode, OAuthError } from '../services/OAuthService';
import { storeSession } from '../storage/SessionStorage';
import { navigateToApp, navigateToLogin } from '../navigation/NavigationService';

jest.mock('../services/OAuthService');
jest.mock('../storage/SessionStorage');
jest.mock('../navigation/NavigationService');

const mockExchangeAuthCode = exchangeAuthCode as jest.MockedFunction<typeof exchangeAuthCode>;
const mockStoreSession = storeSession as jest.MockedFunction<typeof storeSession>;
const mockNavigateToApp = navigateToApp as jest.MockedFunction<typeof navigateToApp>;
const mockNavigateToLogin = navigateToLogin as jest.MockedFunction<typeof navigateToLogin>;

describe('OAuthRedirectHandler', () => {
  const expectedState = 'test-state-123';
  const validCallbackUrl = `myapp://oauth/callback?code=auth-code-456&state=${expectedState}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExchangeAuthCode.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    mockStoreSession.mockResolvedValue(undefined);
  });

  it('exchanges code and stores session on valid callback URL', async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(validCallbackUrl);

    render(<OAuthRedirectHandler expectedState={expectedState} />);

    await waitFor(() => {
      expect(mockExchangeAuthCode).toHaveBeenCalledWith('auth-code-456');
      expect(mockStoreSession).toHaveBeenCalled();
      expect(mockNavigateToApp).toHaveBeenCalled();
    });
  });

  it('rejects callback with mismatched state (CSRF protection)', async () => {
    const maliciousUrl = 'myapp://oauth/callback?code=auth-code-456&state=attacker-state';
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(maliciousUrl);

    render(<OAuthRedirectHandler expectedState={expectedState} />);

    await waitFor(() => {
      expect(mockExchangeAuthCode).not.toHaveBeenCalled();
      expect(mockNavigateToLogin).toHaveBeenCalled();
    });
  });

  it('handles OAuth error from token endpoint', async () => {
    mockExchangeAuthCode.mockRejectedValue(
      new OAuthError('invalid_grant', 'Authorization code has expired')
    );
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(validCallbackUrl);

    render(<OAuthRedirectHandler expectedState={expectedState} />);

    await waitFor(() => {
      expect(mockNavigateToLogin).toHaveBeenCalledWith('Authorization code has expired');
    });
  });

  it('ignores non-OAuth URLs', async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue('myapp://some/other/route');

    render(<OAuthRedirectHandler expectedState={expectedState} />);

    await waitFor(() => {
      expect(mockExchangeAuthCode).not.toHaveBeenCalled();
      expect(mockStoreSession).not.toHaveBeenCalled();
    });
  });
});