import { z } from 'zod';

export const registerUserSchema = z.object({
  email: z.string().email({ message: 'Email not valid' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
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
  isActive: boolean;
  createdAt: Date;
}

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password required' }),
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters' }),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
