// Where auth pages send people afterwards, and how sign-in errors read.

/** Only same-site paths are allowed as a place to return to after signing in (never another site). */
export function safeCallback(value: unknown, fallback = '/profile'): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback;
  // The auth pages themselves are not somewhere to come back to.
  if (/^\/(sign-in|sign-up|forgot-password|reset-password)(\/|\?|$)/.test(path)) return fallback;
  return path.slice(0, 500);
}

/** Auth.js error codes, as the sign-in page explains them. */
export function signInErrorMessage(code: unknown): string | null {
  if (typeof code !== 'string' || !code) return null;
  switch (code) {
    case 'OAuthAccountNotLinked': return 'This email already has a KeyHaven account. Sign in with its password.';
    case 'Configuration': return 'Signing in isn’t set up on this server yet.';
    case 'AccessDenied': return 'That sign-in was cancelled or not allowed.';
    case 'Verification': return 'That sign-in link has expired. Please try again.';
    case 'CredentialsSignin': return 'Email or password is incorrect.';
    default: return 'Signing in didn’t work. Please try again.';
  }
}
