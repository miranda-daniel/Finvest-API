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

  findByInstrumentWithOperations: (portfolioId: number, instrumentId: number) =>
    db.holding.findFirst({
      where: { portfolioId, instrumentId, platformId: null },
      include: { operations: true },
    }),

  findDistinctInstrumentIds: async (): Promise<number[]> => {
    const rows = await db.holding.findMany({
      distinct: ['instrumentId'],
      select: { instrumentId: true },
    });
    return rows.map((r) => r.instrumentId);
  },

  findEarliestOperationDateByInstrumentId: async (instrumentId: number): Promise<Date | null> => {
    const earliest = await db.operation.findFirst({
      where: { holding: { instrumentId } },
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    if (!earliest) {
      return null;
    }
    const d = new Date(earliest.date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  },
};
