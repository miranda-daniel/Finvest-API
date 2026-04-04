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
  token: string;
  user: SessionUser;
}

export interface TokenPayload {
  userId: number;
}
