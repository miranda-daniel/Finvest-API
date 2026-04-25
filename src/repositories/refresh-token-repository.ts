import { db } from '@config/db';

export const RefreshTokenRepository = {
  create: (data: {
    token: string;
    userId: number;
    expires: Date;
    createdByIp: string;
    userAgent?: string;
  }) => db.refreshToken.create({ data }),

  findByToken: (token: string) => db.refreshToken.findUnique({ where: { token } }),

  findActiveByUserId: (userId: number) =>
    db.refreshToken.findMany({
      where: {
        userId,
        revoked: null,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    }),

  revoke: async (id: number, ip: string, replacedByToken?: string) => {
    await db.refreshToken.update({
      where: { id },
      data: {
        revoked: new Date(),
        revokedByIp: ip,
        replacedByToken,
      },
    });
  },

  rotate: (
    oldId: number,
    ip: string,
    newData: {
      token: string;
      userId: number;
      expires: Date;
      createdByIp: string;
      userAgent?: string;
    },
  ) =>
    db.$transaction(async (tx) => {
      const newToken = await tx.refreshToken.create({ data: newData });
      await tx.refreshToken.update({
        where: { id: oldId },
        data: { revoked: new Date(), revokedByIp: ip, replacedByToken: newData.token },
      });
      return newToken;
    }),

  revokeAllForUser: async (userId: number, ip: string) => {
    await db.refreshToken.updateMany({
      where: { userId, revoked: null },
      data: { revoked: new Date(), revokedByIp: ip },
    });
  },
};
