import { z } from 'zod';

export const registerUserSchema = z.object({
  email: z.email({ message: 'Email not valid' }),
  password: z.string().min(1, { message: 'Password required' }),
  firstName: z.string().min(1, { message: 'First name required' }),
  lastName: z.string().min(1, { message: 'Last name required' }),
});

export type RegisterUserRequest = z.infer<typeof registerUserSchema>;

export interface UserIndex {
  firstName: string;
  lastName: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}
