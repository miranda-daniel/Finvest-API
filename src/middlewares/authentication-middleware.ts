import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { ENV_VARIABLES } from '@config/config';
import { TokenPayload } from '@typing/session';

export async function expressAuthentication(
  request: Request,
  securityName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scopes?: string[]
) {
  const jsonSignature = ENV_VARIABLES.jsonSignature;

  if (securityName === 'jwt') {
    const token = request.headers.authorization!;

    if (!token) {
      throw new ApiError(errors.UNAUTHENTICATED);
    }

    try {
      const payloadDecoded = jwt.verify(token, jsonSignature) as TokenPayload;

      return {
        ...payloadDecoded,
        token,
      };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new ApiError(errors.EXPIRED_TOKEN);
      } else {
        throw new ApiError(errors.INVALID_TOKEN);
      }
    }
  }

  return null;
}
