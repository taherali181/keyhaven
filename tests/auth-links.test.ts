import { describe, expect, it } from 'vitest';
import { safeCallback, signInErrorMessage } from '@/lib/auth-links';

describe('where sign-in returns to', () => {
  it('returns to pages on this site', () => {
    expect(safeCallback('/speed')).toBe('/speed');
    expect(safeCallback('/read?story=gift-of-the-magi')).toBe('/read?story=gift-of-the-magi');
    expect(safeCallback(['/academy', '/x'])).toBe('/academy');
  });

  it('never sends people to another site or back to the sign-in pages', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'speed', '', undefined, 42, '/sign-in', '/sign-up?x=1', '/reset-password']) {
      expect(safeCallback(bad)).toBe('/profile');
    }
  });
});

describe('sign-in errors', () => {
  it('explains known problems plainly and falls back for the rest', () => {
    expect(signInErrorMessage('OAuthAccountNotLinked')).toMatch(/already has a KeyHaven account/);
    expect(signInErrorMessage('Configuration')).toMatch(/isn’t set up/);
    expect(signInErrorMessage('Something')).toMatch(/didn’t work/);
    expect(signInErrorMessage(undefined)).toBeNull();
  });
});
