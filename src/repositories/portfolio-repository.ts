import { db } from '@config/db';

export const PortfolioRepository = {
  findManyByUserId: (userId: number) => db.portfolio.findMany({ where: { userId } }),

  findById: (id: number) => db.portfolio.findUnique({ where: { id } }),

  create: (data: { name: string; userId: number }) => db.portfolio.create({ data }),
};
