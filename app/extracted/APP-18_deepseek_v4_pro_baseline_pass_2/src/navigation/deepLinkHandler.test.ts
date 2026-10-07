import { parseResetPasswordUrl, handleDeepLink } from './deepLinkHandler';

describe('parseResetPasswordUrl', () => {
  it('parses a valid reset-password URL', () => {
    const result = parseResetPasswordUrl(
      'myapp://reset-password?token=abc123',
    );
    expect(result).toEqual({
      name: 'ResetPassword',
      params: { token: 'abc123' },
    });
  });

  it('decodes URL-encoded tokens', () => {
    const result = parseResetPasswordUrl(
      'myapp://reset-password?token=abc%2Fdef%3Dghi',
    );
    expect(result).toEqual({
      name: 'ResetPassword',
      params: { token: 'abc/def=ghi' },
    });
  });

  it('returns null for wrong scheme', () => {
    expect(parseResetPasswordUrl('other://reset-password?token=abc')).toBeNull();
  });

  it('returns null for wrong host', () => {
    expect(parseResetPasswordUrl('myapp://other?token=abc')).toBeNull();
  });

  it('returns null for missing token', () => {
    expect(parseResetPasswordUrl('myapp://reset-password')).toBeNull();
  });

  it('returns null for empty token', () => {
    expect(parseResetPasswordUrl('myapp://reset-password?token=')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(parseResetPasswordUrl(null as any)).toBeNull();
    expect(parseResetPasswordUrl(undefined as any)).toBeNull();
  });
});

describe('handleDeepLink', () => {
  const createMockNavigationRef = (isReady = true) => {
    const navigate = jest.fn();
    const ref = {
      current: {
        isReady: () => isReady,
        navigate,
      },
    } as any;
    return { ref, navigate };
  };

  it('navigates to ResetPassword with token on valid URL', () => {
    const { ref, navigate } = createMockNavigationRef();
    const result = handleDeepLink(
      'myapp://reset-password?token=abc123',
      ref,
    );
    expect(result).toBe(true);
    expect(navigate).toHaveBeenCalledWith('ResetPassword', { token: 'abc123' });
  });

  it('returns false when navigation container is not ready', () => {
    const { ref, navigate } = createMockNavigationRef(false);
    const result = handleDeepLink(
      'myapp://reset-password?token=abc123',
      ref,
    );
    expect(result).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('returns false for invalid URL', () => {
    const { ref, navigate } = createMockNavigationRef();
    const result = handleDeepLink('myapp://unknown', ref);
    expect(result).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});