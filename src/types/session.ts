import { ErrorMessage } from './error';

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface Session {
  errors: ErrorMessage[];
  token: string | null;
}

export interface TokenPayload {
  userId: number;
}
