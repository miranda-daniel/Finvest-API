import { db } from '@config/db';

export const PriceSnapshotRepository = {
  findLatestDateByInstrumentId: (instrumentId: number) =>
    db.priceSnapshot.findFirst({
      where: { instrumentId },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),

  findByInstrumentIdsAndDateRange: (instrumentIds: number[], startDate: Date, endDate: Date) =>
    db.priceSnapshot.findMany({
      where: {
        instrumentId: { in: instrumentIds },
        date: { gte: startDate, lte: endDate },
      },
      orderBy: [{ date: 'asc' }, { instrumentId: 'asc' }],
    }),

  upsertMany: (rows: Array<{ instrumentId: number; date: Date; closePrice: number }>) =>
    db.$transaction(
      rows.map((row) =>
        db.priceSnapshot.upsert({
          // eslint-disable-next-line camelcase
          where: { instrumentId_date: { instrumentId: row.instrumentId, date: row.date } },
          update: { closePrice: row.closePrice },
          create: row,
        }),
      ),
    ),
};
