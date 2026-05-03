import { db } from '@config/db';
import { PortfolioPerformanceService } from '../portfolio-performance-service';

describe('PortfolioPerformanceService.getPerformance', () => {
  let userId: number;
  let portfolioId: number;
  let aaplId: number;
  let spxId: number;
  let ndxId: number;

  beforeAll(async () => {
    const stockClass = await db.instrumentClass.upsert({
      where: { name: 'Stock' },
      update: {},
      create: { name: 'Stock' },
    });
    const indexClass = await db.instrumentClass.upsert({
      where: { name: 'Index' },
      update: {},
      create: { name: 'Index' },
    });

    const user = await db.user.create({
      data: {
        email: 'perf-service-test@test.com',
        password: 'hash',
        firstName: 'T',
        lastName: 'T',
      },
    });
    userId = user.id;

    const portfolio = await db.portfolio.create({
      data: { name: 'Perf Test Portfolio', userId },
    });
    portfolioId = portfolio.id;

    const aapl = await db.instrument.upsert({
      where: { symbol: '__PERF_AAPL__' },
      update: {},
      create: {
        symbol: '__PERF_AAPL__',
        name: 'AAPL Test',
        exchange: 'NASDAQ',
        country: 'US',
        instrumentClassId: stockClass.id,
      },
    });
    aaplId = aapl.id;

    const spx = await db.instrument.upsert({
      where: { symbol: '__PERF_SPX__' },
      update: {},
      create: {
        symbol: '__PERF_SPX__',
        name: 'SPX Test',
        exchange: 'NYSE',
        country: 'US',
        instrumentClassId: indexClass.id,
      },
    });
    spxId = spx.id;

    const ndx = await db.instrument.upsert({
      where: { symbol: '__PERF_NDX__' },
      update: {},
      create: {
        symbol: '__PERF_NDX__',
        name: 'NDX Test',
        exchange: 'NASDAQ',
        country: 'US',
        instrumentClassId: indexClass.id,
      },
    });
    ndxId = ndx.id;

    const holding = await db.holding.create({
      data: { portfolioId, instrumentId: aaplId },
    });

    // Use dates relative to today so they fall within ONE_MONTH range
    const day1 = new Date();
    day1.setUTCDate(day1.getUTCDate() - 4);
    day1.setUTCHours(0, 0, 0, 0);
    const day2 = new Date(day1);
    day2.setUTCDate(day2.getUTCDate() + 1);
    const day3 = new Date(day1);
    day3.setUTCDate(day3.getUTCDate() + 2);

    // BUY 10 shares on day1
    await db.operation.create({
      data: {
        holdingId: holding.id,
        type: 'BUY',
        quantity: 10,
        price: 150,
        date: new Date(day1.getTime() + 14 * 60 * 60 * 1000), // 14:00 UTC on day1
      },
    });

    // Snapshots for 3 days
    await db.priceSnapshot.createMany({
      data: [
        { instrumentId: aaplId, date: day1, closePrice: 150 },
        { instrumentId: aaplId, date: day2, closePrice: 160 },
        { instrumentId: aaplId, date: day3, closePrice: 155 },
        { instrumentId: spxId, date: day1, closePrice: 5000 },
        { instrumentId: spxId, date: day2, closePrice: 5100 },
        { instrumentId: spxId, date: day3, closePrice: 5050 },
        { instrumentId: ndxId, date: day1, closePrice: 20000 },
        { instrumentId: ndxId, date: day2, closePrice: 20200 },
        { instrumentId: ndxId, date: day3, closePrice: 20100 },
      ],
    });
  });

  afterAll(async () => {
    await db.priceSnapshot.deleteMany({
      where: { instrumentId: { in: [aaplId, spxId, ndxId] } },
    });
    await db.operation.deleteMany({ where: { holding: { portfolioId } } });
    await db.holding.deleteMany({ where: { portfolioId } });
    await db.portfolio.delete({ where: { id: portfolioId } });
    await db.user.delete({ where: { id: userId } });
    await db.instrument.deleteMany({
      where: { symbol: { in: ['__PERF_AAPL__', '__PERF_SPX__', '__PERF_NDX__'] } },
    });
  });

  it('returns correct portfolio values and normalized returns', async () => {
    const result = await PortfolioPerformanceService.getPerformance(
      portfolioId,
      userId,
      'ONE_MONTH',
      { spxSymbol: '__PERF_SPX__', ndxSymbol: '__PERF_NDX__' },
    );

    expect(result.length).toBe(3);

    // Day 1: base (0% return for all)
    expect(result[0].portfolioValue).toBe(1500); // 10 × 150
    expect(result[0].portfolioReturnPct).toBe(0);
    expect(result[0].spxReturnPct).toBe(0);
    expect(result[0].ndxReturnPct).toBe(0);

    // Day 2: AAPL 160 → +6.67%, SPX 5100 → +2%, NDX 20200 → +1%
    expect(result[1].portfolioValue).toBe(1600); // 10 × 160
    expect(result[1].portfolioReturnPct).toBeCloseTo(6.667, 2);
    expect(result[1].spxReturnPct).toBeCloseTo(2, 2);
    expect(result[1].ndxReturnPct).toBeCloseTo(1, 2);
  });

  it('throws NOT_FOUND when portfolio does not belong to user', async () => {
    await expect(
      PortfolioPerformanceService.getPerformance(portfolioId, 99999, 'ONE_MONTH'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns only available snapshot points when range is wider than history', async () => {
    const result = await PortfolioPerformanceService.getPerformance(
      portfolioId,
      userId,
      'ONE_YEAR',
      { spxSymbol: '__PERF_SPX__', ndxSymbol: '__PERF_NDX__' },
    );
    // Fixture has 3 snapshots; ONE_YEAR is a wider window but only 3 data points exist
    expect(result.length).toBe(3);
  });
});
