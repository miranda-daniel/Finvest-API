import { ValidateError } from 'tsoa';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';

const buildErrorResponse = (err: ApiError | ValidateError | unknown) => {
  if (err instanceof ApiError) {
    // handle known error
    return {
      httpCode: err.httpCode,
      errorCode: err.errorCode,
      message: err.message,
    };
  } else if (err instanceof ValidateError) {
    // handle TSOA validations
    const { httpCode, errorCode, description } = errors.VALIDATION_ERROR;
    return {
      httpCode,
      errorCode,
      message: description,
    };
  } else {
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

  res.status(responseError.httpCode).send(responseError);
};
