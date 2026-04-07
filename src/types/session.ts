import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email not valid' }),
  password: z.string().min(1, { message: 'Password required' }),
});

export type LoginUserRequest = z.infer<typeof loginSchema>;

// The user data returned as part of a successful login response.
// Intentionally minimal — only what the frontend needs to display immediately.
export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

// The full response returned by POST /session/login.
export interface Session {
  jwtToken: string;
  user: SessionUser;
}

// Internal result from loginUser service — includes the raw refresh token
// so the controller can set it as an HTTP-only cookie.
// rawRefreshToken is never returned to the client.
export interface LoginResult extends Session {
  rawRefreshToken: string;
}

// Response returned by POST /session/refresh-token.
export interface RefreshTokenResponse {
  jwtToken: string;
}

// Internal result from refreshToken service.
export interface RefreshResult extends RefreshTokenResponse {
  rawRefreshToken: string;
}

export interface TokenPayload {
  userId: number;
}

// A single active (non-revoked, non-expired) refresh token session for a user.
export interface ActiveSession {
  id: number;
  createdByIp: string;
  userAgent: string | null;
  createdAt: Date;
  expires: Date;
}
