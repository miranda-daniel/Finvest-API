import { db } from '@config/db';
import { RefreshToken } from '@generated/prisma';

export const RefreshTokenRepository = {
  create: async (data: {
    token: string;
    userId: number;
    expires: Date;
    createdByIp: string;
  }): Promise<RefreshToken> => {
    return db.refreshToken.create({ data });
  },

  findByToken: async (token: string): Promise<RefreshToken | null> => {
    return db.refreshToken.findUnique({ where: { token } });
  },

  revoke: async (
    id: number,
    ip: string,
    replacedByToken?: string,
  ): Promise<void> => {
    await db.refreshToken.update({
      where: { id },
      data: {
        revoked: new Date(),
        revokedByIp: ip,
        replacedByToken,
      },
    });
  },

  revokeAllForUser: async (userId: number): Promise<void> => {
    await db.refreshToken.updateMany({
      where: { userId, revoked: null },
      data: { revoked: new Date() },
    });
  },
};
