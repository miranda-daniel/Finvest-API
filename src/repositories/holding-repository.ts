import { db } from '@config/db';

export const HoldingRepository = {
  findOrCreate: async (data: { portfolioId: number; instrumentId: number }) => {
    const existing = await db.holding.findFirst({
      where: {
        portfolioId: data.portfolioId,
        instrumentId: data.instrumentId,
        platformId: null,
      },
    });

    if (existing) {
      return existing;
    }

    return db.holding.create({ data: { ...data, platformId: null } });
  },

  findByPortfolioWithDetails: (portfolioId: number) =>
    db.holding.findMany({
      where: { portfolioId },
      include: {
        instrument: { include: { instrumentClass: true } },
        operations: true,
      },
    }),
};
