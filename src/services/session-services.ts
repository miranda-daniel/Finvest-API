import JWT from 'jsonwebtoken';
import { db } from '@root/prisma/db';
import { ApiError } from '@config/api-error';
import { ENV_VARIABLES } from '@config/config';
import { errors } from '@config/errors';
import { comparePasswords } from '@helpers/utils';
import { Session } from '@typing/session';
import { LoginUserRequest } from '@typing/session';

export class SessionService {
  static loginUser = async (
    credentials: LoginUserRequest
  ): Promise<Session> => {
    const jsonSignature = ENV_VARIABLES.jsonSignature;

    const { email, password } = credentials;

    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new ApiError(errors.INVALID_USER);
    }

    const isMatch = await comparePasswords(password, user!.password);

    if (!isMatch) {
      throw new ApiError(errors.INVALID_CREDENTIALS);
    }

    const tokenCreated = JWT.sign({ userId: user!.id }, jsonSignature!, {
      expiresIn: 3600000,
    });

    return {
      errors: [],
      token: tokenCreated,
    };
  };
}
