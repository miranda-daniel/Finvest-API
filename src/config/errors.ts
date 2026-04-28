export const errors = {
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    httpCode: 400,
    errorCode: 400_000,
    description: 'Invalid credentials',
  },
  INVALID_USER: {
    code: 'INVALID_USER',
    httpCode: 400,
    errorCode: 400_001,
    description: 'Invalid user',
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    httpCode: 400,
    errorCode: 400_002,
    description: 'Invalid token',
  },
  UNAUTHENTICATED: {
    code: 'UNAUTHENTICATED',
    httpCode: 401,
    errorCode: 401_000,
    description: 'Unauthorized',
  },
  EXPIRED_TOKEN: {
    code: 'EXPIRED_TOKEN',
    httpCode: 401,
    errorCode: 401_001,
    description: 'Token expired',
  },
  INVALID_REFRESH_TOKEN: {
    code: 'INVALID_REFRESH_TOKEN',
    httpCode: 401,
    errorCode: 401_002,
    description: 'Invalid or expired refresh token',
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    httpCode: 404,
    errorCode: 404_000,
    description: 'Not found',
  },
  USER_ALREADY_EXISTS: {
    code: 'USER_ALREADY_EXISTS',
    httpCode: 409,
    errorCode: 409_000,
    description: 'User already exists',
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    httpCode: 422,
    errorCode: 422_000,
    description: 'TSOA Validation error',
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    httpCode: 500,
    errorCode: 500_000,
    description: 'Internal server error',
  },
};
