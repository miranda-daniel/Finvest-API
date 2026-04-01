import JWT from 'jsonwebtoken';
import { ApiError } from '@config/api-error';
import { ENV_VARIABLES } from '@config/config';
import { errors } from '@config/errors';
import { comparePasswords } from '@helpers/password';
import { UserRepository } from '@repositories/user-repository';
import { Session, LoginUserRequest } from '@typing/session';

export class SessionService {
  static loginUser = async (
    credentials: LoginUserRequest,
  ): Promise<Session> => {
    const { email, password } = credentials;

    const user = await UserRepository.findByEmail(email);

    if (!user) {
      throw new ApiError(errors.INVALID_USER);
    }

    const isMatch = await comparePasswords(password, user.password);

    if (!isMatch) {
      throw new ApiError(errors.INVALID_CREDENTIALS);
    }

    const tokenCreated = JWT.sign(
      { userId: user.id },
      ENV_VARIABLES.jwtSignature,
      {
        expiresIn: ENV_VARIABLES.jwtExpiresIn,
      },
    );

    return { token: tokenCreated };
  };
}
