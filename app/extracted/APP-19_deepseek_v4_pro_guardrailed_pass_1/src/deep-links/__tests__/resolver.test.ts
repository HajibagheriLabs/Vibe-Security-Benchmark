// src/deep-links/__tests__/resolver.test.ts
import { resolveDeepLink } from '../resolver';

describe('resolveDeepLink', () => {
  it('accepts valid article link', () => {
    const result = resolveDeepLink(
      'https://app.example.com/article?id=123e4567-e89b-12d3-a456-426614174000'
    );
    expect(result).toEqual({
      route: 'article',
      params: { id: '123e4567-e89b-12d3-a456-426614174000' },
    });
  });

  it('rejects unknown route', () => {
    expect(resolveDeepLink('https://app.example.com/admin?id=123')).toBeNull();
  });

  it('rejects wrong type', () => {
    expect(resolveDeepLink('https://app.example.com/article?id=not-a-uuid')).toBeNull();
  });

  it('rejects path traversal', () => {
    expect(resolveDeepLink('https://app.example.com/../../etc/passwd')).toBeNull();
  });

  it('rejects non-https protocol', () => {
    expect(resolveDeepLink('http://app.example.com/article?id=123')).toBeNull();
    expect(resolveDeepLink('javascript:alert(1)')).toBeNull();
    expect(resolveDeepLink('file:///etc/passwd')).toBeNull();
  });

  it('rejects wrong hostname', () => {
    expect(resolveDeepLink('https://evil.com/article?id=123')).toBeNull();
    expect(resolveDeepLink('https://app.example.com.evil.com/article?id=123')).toBeNull();
  });

  it('rejects credentials in URL', () => {
    expect(resolveDeepLink('https://user:pass@app.example.com/article?id=123')).toBeNull();
  });

  it('rejects mutation attempts', () => {
    expect(
      resolveDeepLink('https://app.example.com/article?id=123&isAdmin=true&amount=0')
    ).toBeNull();
  });
});