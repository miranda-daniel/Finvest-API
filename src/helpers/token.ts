import crypto from 'crypto';

export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const REFRESH_TOKEN_COOKIE_MAX_AGE =
  REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60; // seconds

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiry(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expires;
}
