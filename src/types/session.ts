import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ message: 'Email not valid' }),
  password: z.string().min(1, { message: 'Password required' }),
});

export type LoginUserRequest = z.infer<typeof loginSchema>;

export interface Session {
  token: string;
}

export interface TokenPayload {
  userId: number;
}
