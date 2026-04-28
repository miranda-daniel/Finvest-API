import { db } from '@config/db';

export const PortfolioRepository = {
  findManyByUserId: (userId: number) => db.portfolio.findMany({ where: { userId } }),

  findById: (id: number) => db.portfolio.findUnique({ where: { id } }),

  create: (data: { name: string; description?: string; userId: number }) =>
    db.portfolio.create({ data }),

  createAndSetFavorite: (data: { name: string; description?: string; userId: number }) =>
    db.$transaction(async (tx) => {
      const portfolio = await tx.portfolio.create({ data });

      await tx.user.update({
        where: { id: data.userId },
        data: { favoritePortfolioId: portfolio.id },
      });

      return portfolio;
    }),
};
