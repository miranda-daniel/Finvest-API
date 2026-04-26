import { ValidateError } from '@tsoa/runtime';
import { ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import logger from '@config/logger';

// Shape returned by every error handler.
interface ErrorResponse {
  httpCode: number;
  errorCode: number;
  message: string;
}

// Each handler returns an ErrorResponse if it recognises the error, or null to pass it on.
// To support a new error type, add an entry here — no other code needs to change.
const errorHandlers: Array<(err: unknown) => ErrorResponse | null> = [
  (err) => {
    if (!(err instanceof ApiError)) {
      return null;
    }
    logger.error(`API Error - Code: ${err.errorCode}, Message: ${err.message}`);
    return {
      httpCode: err.httpCode,
      errorCode: err.errorCode,
      message: err.message,
    };
  },

  (err) => {
    if (!(err instanceof ZodError)) {
      return null;
    }
    logger.warn(`Validation Error - ${JSON.stringify(err.issues)}`);
    const { httpCode, errorCode } = errors.VALIDATION_ERROR;
    return {
      httpCode,
      errorCode,
      message: err.issues.map((i) => i.message).join(', '),
    };
  },

  (err) => {
    if (!(err instanceof ValidateError)) {
      return null;
    }
    logger.warn(`Validation Error - Message: ${errors.VALIDATION_ERROR.description}`);
    const { httpCode, errorCode, description } = errors.VALIDATION_ERROR;
    return {
      httpCode,
      errorCode,
      message: description,
    };
  },
];

const fallbackHandler = (err: unknown): ErrorResponse => {
  const detail = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
  logger.error(`Internal Server Error - ${detail}`);
  const { httpCode, errorCode, description } = errors.INTERNAL_SERVER_ERROR;
  return { httpCode, errorCode, message: description };
};

const buildErrorResponse = (err: unknown): ErrorResponse => {
  for (const handler of errorHandlers) {
    const result = handler(err);
    if (result) {
      return result;
    }
  }
  return fallbackHandler(err);
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const responseError = buildErrorResponse(err);

  logger.info(
    `Request failed - URL: ${req.url}, Method: ${req.method}, Status Code: ${responseError.httpCode}`,
  );

  res.status(responseError.httpCode).send(responseError);
};
