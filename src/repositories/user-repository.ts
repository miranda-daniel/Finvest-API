import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { Prisma } from '@generated/prisma';
import { db } from '@config/db';
import { RegisterUserRequest } from '@typing/user';

export const UserRepository = {
  findMany: () => db.user.findMany(),

  findById: (id: number) => db.user.findUnique({ where: { id } }),

  findByEmail: (email: string) => db.user.findUnique({ where: { email } }),

  create: async (data: RegisterUserRequest) => {
    try {
      return await db.user.create({ data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ApiError(errors.USER_ALREADY_EXISTS);
      }
      throw err;
    }
  },

  update: (id: number, data: Partial<RegisterUserRequest>) =>
    db.user.update({ where: { id }, data }),

  setFavoritePortfolio: (userId: number, portfolioId: number | null) =>
    db.user.update({ where: { id: userId }, data: { favoritePortfolioId: portfolioId } }),
};
