import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { ENV_VARIABLES } from '@config/config';
import { TokenPayload } from '@typing/session';

export const expressAuthentication = async (
  request: Request,
  securityName: string,
  _scopes?: string[],
): Promise<(TokenPayload & { token: string }) | null> => {
  if (securityName === 'jwt') {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new ApiError(errors.UNAUTHENTICATED);
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    try {
      const payloadDecoded = jwt.verify(token, ENV_VARIABLES.jwtSignature) as TokenPayload;

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

  throw new ApiError(errors.UNAUTHENTICATED);
};
