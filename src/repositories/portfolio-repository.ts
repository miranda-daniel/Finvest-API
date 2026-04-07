import { db } from '@config/db';

export const PortfolioRepository = {
  findManyByUserId: (userId: number) => db.portfolio.findMany({ where: { userId } }),

  create: (data: { name: string; userId: number }) => db.portfolio.create({ data }),
};
