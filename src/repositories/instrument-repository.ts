import { db } from '@config/db';

export const InstrumentRepository = {
  findBySymbol: (symbol: string) => db.instrument.findUnique({ where: { symbol } }),

  findOrCreate: (data: {
    symbol: string;
    name: string;
    exchange: string;
    instrumentClassId: number;
  }) =>
    db.instrument.upsert({
      where: { symbol: data.symbol },
      update: {},
      create: data,
    }),

  findOrCreateClass: (name: string) =>
    db.instrumentClass.upsert({
      where: { name },
      update: {},
      create: { name },
    }),
};
