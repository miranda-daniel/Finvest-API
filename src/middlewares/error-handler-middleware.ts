import { ValidateError } from 'tsoa';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import logger from '@config/logger';

const buildErrorResponse = (err: ApiError | ValidateError | unknown) => {
  if (err instanceof ApiError) {
    logger.error(`API Error - Code: ${err.errorCode}, Message: ${err.message}`);

    // handle known error
    return {
      httpCode: err.httpCode,
      errorCode: err.errorCode,
      message: err.message,
    };
  } else if (err instanceof ValidateError) {
    logger.warn(
      `Validation Error - Message: ${errors.VALIDATION_ERROR.description}`
    );

    // handle TSOA validations
    const { httpCode, errorCode, description } = errors.VALIDATION_ERROR;
    return {
      httpCode,
      errorCode,
      message: description,
    };
  } else {
    logger.error(
      `Internal Server Error - Message: ${errors.INTERNAL_SERVER_ERROR.description}`
    );

    // handle Internal Server error
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  const responseError = buildErrorResponse(err);

  logger.info(
    `Request failed - URL: ${req.url}, Method: ${req.method}, Status Code: ${responseError.httpCode}`
  );

  res.status(responseError.httpCode).send(responseError);
};
