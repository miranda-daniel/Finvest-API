import JWT from 'jsonwebtoken';
import { ApiError } from '@config/api-error';
import { ENV_VARIABLES } from '@config/config';
import { errors } from '@config/errors';
import { comparePasswords } from '@helpers/password';
import {
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashToken,
} from '@helpers/token';
import { RefreshTokenRepository } from '@repositories/refresh-token-repository';
import { UserRepository } from '@repositories/user-repository';
import { LoginUserRequest, LoginResult } from '@typing/session';

export const SessionService = {
  loginUser: async (
    credentials: LoginUserRequest,
    ip: string,
  ): Promise<LoginResult> => {
    const { email, password } = credentials;

    const user = await UserRepository.findByEmail(email);

    if (!user) {
      throw new ApiError(errors.INVALID_USER);
    }

    const isMatch = await comparePasswords(password, user.password);

    if (!isMatch) {
      throw new ApiError(errors.INVALID_CREDENTIALS);
    }

    const jwtToken = JWT.sign({ userId: user.id }, ENV_VARIABLES.jwtSignature, {
      expiresIn: ENV_VARIABLES.jwtExpiresIn,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);

    await RefreshTokenRepository.create({
      token: tokenHash,
      userId: user.id,
      expires: getRefreshTokenExpiry(),
      createdByIp: ip,
    });

    return {
      jwtToken,
      rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  },
};
