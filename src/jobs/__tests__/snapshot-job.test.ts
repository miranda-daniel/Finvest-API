import { runSnapshotJob } from '../snapshot-job';
import { InstrumentClient } from '@clients/twelve-data-client';
import { db } from '@config/db';

jest.mock('@clients/twelve-data-client', () => ({
  InstrumentClient: {
    getHistoricalClosePrices: jest.fn(),
  },
}));

const mockGetHistorical = InstrumentClient.getHistoricalClosePrices as jest.Mock;

describe('runSnapshotJob', () => {
  beforeAll(async () => {
    // Seed minimal data: one holding with one instrument
    const cls = await db.instrumentClass.upsert({
      where: { name: 'Stock' },
      update: {},
      create: { name: 'Stock' },
    });
    const instrument = await db.instrument.upsert({
      where: { symbol: '__SNAP_JOB_TEST__' },
      update: {},
      create: {
        symbol: '__SNAP_JOB_TEST__',
        name: 'Snapshot Job Test',
        exchange: 'NYSE',
        country: 'US',
        instrumentClassId: cls.id,
      },
    });
    const portfolio = await db.portfolio.create({
      data: {
        name: 'Test Portfolio',
        user: {
          create: {
            email: 'snapshot-job-test@test.com',
            password: 'hash',
            firstName: 'T',
            lastName: 'T',
          },
        },
      },
    });
    const holding = await db.holding.create({
      data: { portfolioId: portfolio.id, instrumentId: instrument.id },
    });
    await db.operation.create({
      data: {
        holdingId: holding.id,
        type: 'BUY',
        quantity: 5,
        price: 100,
        date: new Date('2026-01-15T14:30:00Z'),
      },
    });
  });

  afterAll(async () => {
    await db.priceSnapshot.deleteMany({
      where: { instrument: { symbol: { in: ['__SNAP_JOB_TEST__', 'SPX', 'NDX'] } } },
    });
    await db.operation.deleteMany({
      where: { holding: { instrument: { symbol: '__SNAP_JOB_TEST__' } } },
    });
    await db.holding.deleteMany({ where: { instrument: { symbol: '__SNAP_JOB_TEST__' } } });
    await db.portfolio.deleteMany({ where: { name: 'Test Portfolio' } });
    await db.user.deleteMany({ where: { email: 'snapshot-job-test@test.com' } });
    await db.instrument.deleteMany({ where: { symbol: '__SNAP_JOB_TEST__' } });
  });

  it('calls getHistoricalClosePrices for held instruments and benchmarks', async () => {
    mockGetHistorical.mockResolvedValue([
      { date: '2026-01-15', close: 100.5 },
      { date: '2026-01-16', close: 101.0 },
    ]);

    await runSnapshotJob();

    // Should have been called for __SNAP_JOB_TEST__, SPX, NDX
    const calledSymbols = mockGetHistorical.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledSymbols).toContain('__SNAP_JOB_TEST__');
    expect(calledSymbols).toContain('SPX');
    expect(calledSymbols).toContain('NDX');
  });

  it('skips an instrument already up to date (no calls after yesterday)', async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    // Pre-populate snapshot for yesterday
    const instrument = await db.instrument.findUnique({ where: { symbol: '__SNAP_JOB_TEST__' } });

    await db.priceSnapshot.upsert({
      // eslint-disable-next-line camelcase
      where: { instrumentId_date: { instrumentId: instrument!.id, date: yesterday } },
      update: { closePrice: 200 },
      create: { instrumentId: instrument!.id, date: yesterday, closePrice: 200 },
    });

    mockGetHistorical.mockClear();
    await runSnapshotJob();

    const calledSymbols = mockGetHistorical.mock.calls.map((c: unknown[]) => c[0]);
    expect(calledSymbols).not.toContain('__SNAP_JOB_TEST__');
  });

  it('does not crash if getHistoricalClosePrices throws for one symbol', async () => {
    mockGetHistorical.mockRejectedValueOnce(new Error('TwelveData rate limit'));
    mockGetHistorical.mockResolvedValue([]);

    await expect(runSnapshotJob()).resolves.not.toThrow();
  });
});
