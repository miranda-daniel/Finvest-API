import { ValidateError } from 'tsoa';
import { ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import logger from '@config/logger';

const buildErrorResponse = (
  err: ApiError | ValidateError | ZodError | unknown,
) => {
  if (err instanceof ApiError) {
    logger.error(`API Error - Code: ${err.errorCode}, Message: ${err.message}`);

    return {
      httpCode: err.httpCode,
      errorCode: err.errorCode,
      message: err.message,
    };
  } else if (err instanceof ZodError) {
    logger.warn(`Validation Error - ${JSON.stringify(err.issues)}`);

    const { httpCode, errorCode } = errors.VALIDATION_ERROR;
    return {
      httpCode,
      errorCode,
      message: err.issues.map((i) => i.message).join(', '),
    };
  } else if (err instanceof ValidateError) {
    logger.warn(
      `Validation Error - Message: ${errors.VALIDATION_ERROR.description}`,
    );

    const { httpCode, errorCode, description } = errors.VALIDATION_ERROR;
    return {
      httpCode,
      errorCode,
      message: description,
    };
  } else {
    logger.error(
      `Internal Server Error - Message: ${errors.INTERNAL_SERVER_ERROR.description}`,
    );

    const { httpCode, errorCode, description } = errors.INTERNAL_SERVER_ERROR;
    return {
      httpCode,
      errorCode,
      message: description,
    };
  }
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const responseError = buildErrorResponse(err);

  logger.info(
    `Request failed - URL: ${req.url}, Method: ${req.method}, Status Code: ${responseError.httpCode}`,
  );

  res.status(responseError.httpCode).send(responseError);
};
