export const errors = {
  INVALID_CREDENTIALS: {
    httpCode: 400,
    errorCode: 400_000,
    description: 'Invalid credentials',
  },
  INVALID_USER: {
    httpCode: 400,
    errorCode: 400_001,
    description: 'Invalid user',
  },
  INVALID_TOKEN: {
    httpCode: 400,
    errorCode: 400_003,
    description: 'Invalid token',
  },
  UNAUTHENTICATED: {
    httpCode: 401,
    errorCode: 401_000,
    description: 'Unauthorized',
  },
  EXPIRED_TOKEN: {
    httpCode: 401,
    errorCode: 401_001,
    description: 'Token expired',
  },
  NOT_FOUND: {
    httpCode: 404,
    errorCode: 404_000,
    description: 'Not found',
  },
  USER_ALREADY_EXISTS: {
    httpCode: 409,
    errorCode: 409_000,
    description: 'User already exists',
  },
  VALIDATION_ERROR: {
    // tsoa error
    httpCode: 422,
    errorCode: 422_000,
    description: 'TSOA Validation error',
  },
  INTERNAL_SERVER_ERROR: {
    httpCode: 500,
    errorCode: 500_000,
    description: 'Internal server error',
  },
};
