export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface ErrorMessage {
  message: string;
}

export interface Session {
  errors: ErrorMessage[];
  token: string | null;
}

export interface TokenPayload {
  userId: number;
}

export interface Context {
  user: TokenPayload & {
    token: string;
  };
}
