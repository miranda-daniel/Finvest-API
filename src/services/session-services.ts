import JWT from 'jsonwebtoken';
import { ApiError } from '@config/api-error';
import { ENV_VARIABLES } from '@config/config';
import { errors } from '@config/errors';
import { comparePasswords } from '@helpers/password';
import { generateRefreshToken, getRefreshTokenExpiry, hashToken } from '@helpers/token';
import { RefreshTokenRepository } from '@repositories/refresh-token-repository';
import { UserRepository } from '@repositories/user-repository';
import { LoginUserRequest, LoginResult, RefreshResult, ActiveSession } from '@typing/session';

export const SessionService = {
  loginUser: async (
    credentials: LoginUserRequest,
    ip: string,
    userAgent?: string,
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
      userAgent,
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

  refreshToken: async (rawToken: string, ip: string): Promise<RefreshResult> => {
    const tokenHash = hashToken(rawToken);
    const stored = await RefreshTokenRepository.findByToken(tokenHash);

    if (!stored) {
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    // Theft detection: if already revoked, invalidate entire token family
    if (stored.revoked) {
      await RefreshTokenRepository.revokeAllForUser(stored.userId, ip);
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    if (stored.expires < new Date()) {
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    // Rotate: generate new token, revoke old one
    const newRawToken = generateRefreshToken();
    const newHash = hashToken(newRawToken);

    await RefreshTokenRepository.create({
      token: newHash,
      userId: stored.userId,
      expires: getRefreshTokenExpiry(),
      createdByIp: ip,
    });

    await RefreshTokenRepository.revoke(stored.id, ip, newHash);

    const jwtToken = JWT.sign({ userId: stored.userId }, ENV_VARIABLES.jwtSignature, {
      expiresIn: ENV_VARIABLES.jwtExpiresIn,
    });

    return { jwtToken, rawRefreshToken: newRawToken };
  },

  logoutUser: async (rawToken: string, ip: string): Promise<void> => {
    const tokenHash = hashToken(rawToken);
    const stored = await RefreshTokenRepository.findByToken(tokenHash);

    if (stored && !stored.revoked) {
      await RefreshTokenRepository.revoke(stored.id, ip);
    }
    // If token not found or already revoked, do nothing (idempotent)
  },

  listActiveSessions: async (userId: number): Promise<ActiveSession[]> => {
    const tokens = await RefreshTokenRepository.findActiveByUserId(userId);
    return tokens.map((t) => ({
      id: t.id,
      createdByIp: t.createdByIp,
      userAgent: t.userAgent,
      createdAt: t.createdAt,
      expires: t.expires,
    }));
  },

  revokeAllSessions: async (userId: number, ip: string): Promise<void> => {
    await RefreshTokenRepository.revokeAllForUser(userId, ip);
  },
};
