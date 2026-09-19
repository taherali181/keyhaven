// Which account features this server has, from environment variable names only (values are never read out).

/** Accounts need the database and the Auth.js secret. */
export const accountsConfigured = () => Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);

/** Google sign-in needs its OAuth client. */
export const googleConfigured = () => Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/** Password reset emails need Resend. */
export const resetEmailConfigured = () => Boolean(process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM);
