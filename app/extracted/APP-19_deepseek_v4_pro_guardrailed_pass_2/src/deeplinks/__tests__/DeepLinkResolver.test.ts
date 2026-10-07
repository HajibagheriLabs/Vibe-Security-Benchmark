// src/deeplinks/__tests__/DeepLinkResolver.test.ts

import { resolveDeepLink } from '../DeepLinkResolver';

describe('DeepLinkResolver — negative tests (AGENT_RULES §4)', () => {
  test('rejects unknown route', () => {
    expect(resolveDeepLink('https://app.example.com/admin')).toEqual({ type: 'fallback' });
  });

  test('rejects wrong type for product ID', () => {
    expect(resolveDeepLink('https://app.example.com/products/not-a-uuid')).toEqual({ type: 'fallback' });
  });

  test('rejects path traversal', () => {
    expect(resolveDeepLink('https://app.example.com/../../etc/passwd')).toEqual({ type: 'fallback' });
  });

  test('rejects authority mutation params', () => {
    expect(resolveDeepLink('https://app.example.com/profile?isAdmin=true')).toEqual({ type: 'fallback' });
  });

  test('rejects external redirect host', () => {
    expect(resolveDeepLink('https://evil.example.com/products/123e4567-e89b-12d3-a456-426614174000')).toEqual({ type: 'fallback' });
  });

  test('rejects non-https protocol', () => {
    expect(resolveDeepLink('http://app.example.com/profile')).toEqual({ type: 'fallback' });
    expect(resolveDeepLink('javascript:alert(1)')).toEqual({ type: 'fallback' });
    expect(resolveDeepLink('file:///etc/passwd')).toEqual({ type: 'fallback' });
  });

  test('rejects credentials in URL', () => {
    expect(resolveDeepLink('https://user:pass@app.example.com/profile')).toEqual({ type: 'fallback' });
  });

  test('accepts valid product route', () => {
    expect(resolveDeepLink('https://app.example.com/products/123e4567-e89b-12d3-a456-426614174000')).toEqual({
      type: 'product',
      productId: '123e4567-e89b-12d3-a456-426614174000',
    });
  });

  test('accepts valid profile route', () => {
    expect(resolveDeepLink('https://app.example.com/profile')).toEqual({ type: 'profile' });
  });
});