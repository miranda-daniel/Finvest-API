# Daily Price Snapshot Job — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run a daily cron job at 23:00 UTC that fetches closing prices from TwelveData and stores them in `PriceSnapshot` for all instruments ever held in any portfolio plus SPX and NDX as benchmarks, with automatic backfill on server startup.

**Architecture:** `src/jobs/snapshot-job.ts` encapsulates all logic — backfill detection, TwelveData calls, DB writes. It registers itself in `src/index.ts` at startup (runs backfill immediately) and schedules a daily cron via `node-cron`. A new `PriceSnapshotRepository` handles all `PriceSnapshot` DB operations. A new `InstrumentRepository` provides symbol lookups shared across the app.

**Tech Stack:** node-cron, Prisma (existing), TwelveData `/time_series` endpoint, existing ioredis + logger infrastructure.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/clients/twelve-data-client.ts` — add `getHistoricalClosePrices` |
| Create | `src/repositories/instrument-repository.ts` |
| Create | `src/repositories/price-snapshot-repository.ts` |
| Modify | `src/repositories/holding-repository.ts` — add `findDistinctInstrumentIds` |
| Create | `src/jobs/snapshot-job.ts` |
| Modify | `src/index.ts` — register job at startup |
| Modify | `package.json` — add `node-cron` dependency |
| Create | `src/repositories/__tests__/price-snapshot-repository.test.ts` |
| Create | `src/jobs/__tests__/snapshot-job.test.ts` |

---

### Task 1: Add `getHistoricalClosePrices` to TwelveData client

**Files:**
- Modify: `src/clients/twelve-data-client.ts`

- [ ] **Step 1: Install node-cron**

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

Expected: `node-cron` appears in `package.json` dependencies.

- [ ] **Step 2: Add `getHistoricalClosePrices` to `InstrumentClient`**

Add this method after `getBatchEodPrices` in `src/clients/twelve-data-client.ts`:

```ts
  // Returns daily closing prices for a symbol between startDate and endDate (inclusive).
  // Dates are "YYYY-MM-DD" strings. Returns oldest-first (TwelveData returns newest-first, reversed here).
  getHistoricalClosePrices: async (
    symbol: string,
    startDate: string,
    endDate: string,
  ): Promise<Array<{ date: string; close: number }>> => {
    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', '1day');
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);
    url.searchParams.set('outputsize', '5000');
    url.searchParams.set('apikey', ENV_VARIABLES.twelveDataApiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`TwelveData time_series failed: ${res.status}`);
    }

    const json = (await res.json()) as unknown;

    if ((json as { status?: string }).status === 'error') {
      throw new Error(
        `TwelveData time_series error for ${symbol}: ${(json as { message?: string }).message ?? 'unknown'}`,
      );
    }

    const data = json as { values?: Array<{ datetime: string; close: string }> };

    return (data.values ?? [])
      .map((v) => ({ date: v.datetime.slice(0, 10), close: parseFloat(v.close) }))
      .filter((v) => !isNaN(v.close))
      .reverse(); // TwelveData returns newest-first; we want oldest-first
  },
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/clients/twelve-data-client.ts package.json package-lock.json
git commit -m "feat(snapshot): add getHistoricalClosePrices to TwelveData client"
```

---

### Task 2: PriceSnapshotRepository + InstrumentRepository

**Files:**
- Create: `src/repositories/price-snapshot-repository.ts`
- Create: `src/repositories/instrument-repository.ts`
- Modify: `src/repositories/holding-repository.ts`
- Create: `src/repositories/__tests__/price-snapshot-repository.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/repositories/__tests__/price-snapshot-repository.test.ts`:

```ts
import { db } from '@config/db';
import { PriceSnapshotRepository } from '../price-snapshot-repository';

describe('PriceSnapshotRepository', () => {
  let instrumentId: number;

  beforeAll(async () => {
    const cls = await db.instrumentClass.upsert({
      where: { name: 'Stock' },
      update: {},
      create: { name: 'Stock' },
    });
    const instrument = await db.instrument.create({
      data: {
        symbol: '__TEST_SNAP__',
        name: 'Test Snapshot Instrument',
        exchange: 'NYSE',
        country: 'US',
        instrumentClassId: cls.id,
      },
    });
    instrumentId = instrument.id;
  });

  afterAll(async () => {
    await db.priceSnapshot.deleteMany({ where: { instrumentId } });
    await db.instrument.delete({ where: { id: instrumentId } });
  });

  it('returns null when no snapshots exist', async () => {
    const result = await PriceSnapshotRepository.findLatestDateByInstrumentId(instrumentId);
    expect(result).toBeNull();
  });

  it('upsertMany inserts snapshots and findLatestDate returns newest', async () => {
    await PriceSnapshotRepository.upsertMany([
      { instrumentId, date: new Date('2026-01-01'), closePrice: 100 },
      { instrumentId, date: new Date('2026-01-03'), closePrice: 105 },
      { instrumentId, date: new Date('2026-01-02'), closePrice: 102 },
    ]);

    const latest = await PriceSnapshotRepository.findLatestDateByInstrumentId(instrumentId);
    expect(latest?.date.toISOString().slice(0, 10)).toBe('2026-01-03');
  });

  it('upsertMany updates existing rows without creating duplicates', async () => {
    await PriceSnapshotRepository.upsertMany([
      { instrumentId, date: new Date('2026-01-01'), closePrice: 999 },
    ]);

    const rows = await db.priceSnapshot.findMany({
      where: { instrumentId, date: new Date('2026-01-01') },
    });
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].closePrice)).toBe(999);
  });

  it('findByInstrumentIdsAndDateRange returns snapshots within range', async () => {
    const results = await PriceSnapshotRepository.findByInstrumentIdsAndDateRange(
      [instrumentId],
      new Date('2026-01-01'),
      new Date('2026-01-02'),
    );
    expect(results).toHaveLength(2);
    expect(results[0].date.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(results[1].date.toISOString().slice(0, 10)).toBe('2026-01-02');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="price-snapshot-repository"
```

Expected: FAIL with "Cannot find module '../price-snapshot-repository'".

- [ ] **Step 3: Create `PriceSnapshotRepository`**

Create `src/repositories/price-snapshot-repository.ts`:

```ts
import { db } from '@config/db';

export const PriceSnapshotRepository = {
  findLatestDateByInstrumentId: (instrumentId: number) =>
    db.priceSnapshot.findFirst({
      where: { instrumentId },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),

  findByInstrumentIdsAndDateRange: (
    instrumentIds: number[],
    startDate: Date,
    endDate: Date,
  ) =>
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
          where: { instrumentId_date: { instrumentId: row.instrumentId, date: row.date } },
          update: { closePrice: row.closePrice },
          create: row,
        }),
      ),
    ),
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="price-snapshot-repository"
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Create `InstrumentRepository`**

Create `src/repositories/instrument-repository.ts`:

```ts
import { db } from '@config/db';

export const InstrumentRepository = {
  findBySymbol: (symbol: string) =>
    db.instrument.findUnique({ where: { symbol } }),

  findBySymbols: (symbols: string[]) =>
    db.instrument.findMany({
      where: { symbol: { in: symbols } },
      select: { id: true, symbol: true },
    }),

  findByIds: (ids: number[]) =>
    db.instrument.findMany({
      where: { id: { in: ids } },
      select: { id: true, symbol: true },
    }),

  upsert: (data: {
    symbol: string;
    name: string;
    exchange: string;
    country: string;
    instrumentClassId: number;
  }) =>
    db.instrument.upsert({
      where: { symbol: data.symbol },
      update: {},
      create: data,
    }),
};
```

- [ ] **Step 6: Add `findDistinctInstrumentIds` to `HoldingRepository`**

Add this method to the existing `HoldingRepository` object in `src/repositories/holding-repository.ts`:

```ts
  findDistinctInstrumentIds: async (): Promise<number[]> => {
    const rows = await db.holding.findMany({
      distinct: ['instrumentId'],
      select: { instrumentId: true },
    });
    return rows.map((r) => r.instrumentId);
  },
```

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/repositories/price-snapshot-repository.ts src/repositories/instrument-repository.ts src/repositories/holding-repository.ts src/repositories/__tests__/price-snapshot-repository.test.ts
git commit -m "feat(snapshot): add PriceSnapshotRepository and InstrumentRepository"
```

---

### Task 3: snapshot-job.ts

**Files:**
- Create: `src/jobs/snapshot-job.ts`
- Create: `src/jobs/__tests__/snapshot-job.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/jobs/__tests__/snapshot-job.test.ts`:

```ts
import { runSnapshotJob } from '../snapshot-job';
import { InstrumentClient } from '@clients/twelve-data-client';
import { PriceSnapshotRepository } from '@repositories/price-snapshot-repository';
import { HoldingRepository } from '@repositories/holding-repository';
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
    await db.operation.deleteMany({ where: { holding: { instrument: { symbol: '__SNAP_JOB_TEST__' } } } });
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="snapshot-job"
```

Expected: FAIL with "Cannot find module '../snapshot-job'".

- [ ] **Step 3: Create `src/jobs/snapshot-job.ts`**

```ts
import cron from 'node-cron';
import { db } from '@config/db';
import logger from '@config/logger';
import { InstrumentClient } from '@clients/twelve-data-client';
import { PriceSnapshotRepository } from '@repositories/price-snapshot-repository';
import { HoldingRepository } from '@repositories/holding-repository';
import { InstrumentRepository } from '@repositories/instrument-repository';

const BENCHMARK_SYMBOLS = ['SPX', 'NDX'] as const;
const DELAY_MS = 200;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

const yesterday = (): Date => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const oneYearAgo = (): Date => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const ensureIndexClass = async (): Promise<number> => {
  const cls = await db.instrumentClass.upsert({
    where: { name: 'Index' },
    update: {},
    create: { name: 'Index' },
  });
  return cls.id;
};

const ensureBenchmarks = async (indexClassId: number): Promise<number[]> => {
  const benchmarks = await Promise.all([
    InstrumentRepository.upsert({
      symbol: 'SPX',
      name: 'S&P 500 Index',
      exchange: 'NYSE',
      country: 'US',
      instrumentClassId: indexClassId,
    }),
    InstrumentRepository.upsert({
      symbol: 'NDX',
      name: 'Nasdaq 100 Index',
      exchange: 'NASDAQ',
      country: 'US',
      instrumentClassId: indexClassId,
    }),
  ]);
  return benchmarks.map((b) => b.id);
};

const getEarliestOperationDateForInstrument = async (instrumentId: number): Promise<Date | null> => {
  const earliest = await db.operation.findFirst({
    where: { holding: { instrumentId } },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  if (!earliest) return null;
  const d = new Date(earliest.date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const processInstrument = async (
  instrumentId: number,
  symbol: string,
  isBenchmark: boolean,
): Promise<void> => {
  const latest = await PriceSnapshotRepository.findLatestDateByInstrumentId(instrumentId);

  let startDate: Date;
  if (latest) {
    startDate = new Date(latest.date);
    startDate.setUTCDate(startDate.getUTCDate() + 1);
  } else if (isBenchmark) {
    startDate = oneYearAgo();
  } else {
    startDate = (await getEarliestOperationDateForInstrument(instrumentId)) ?? oneYearAgo();
  }

  const end = yesterday();

  if (startDate > end) {
    return; // already up to date
  }

  const closes = await InstrumentClient.getHistoricalClosePrices(
    symbol,
    toDateString(startDate),
    toDateString(end),
  );

  if (closes.length === 0) return;

  await PriceSnapshotRepository.upsertMany(
    closes.map((c) => ({
      instrumentId,
      date: new Date(c.date),
      closePrice: c.close,
    })),
  );

  logger.info(`[snapshot-job] ${symbol}: saved ${closes.length} snapshots`);
};

export const runSnapshotJob = async (): Promise<void> => {
  logger.info('[snapshot-job] starting');

  try {
    const indexClassId = await ensureIndexClass();
    const benchmarkIds = await ensureBenchmarks(indexClassId);

    const holdingInstrumentIds = await HoldingRepository.findDistinctInstrumentIds();
    const allIds = [...new Set([...holdingInstrumentIds, ...benchmarkIds])];

    const instruments = await InstrumentRepository.findByIds(allIds);

    for (const instrument of instruments) {
      const isBenchmark = (BENCHMARK_SYMBOLS as readonly string[]).includes(instrument.symbol);
      try {
        await processInstrument(instrument.id, instrument.symbol, isBenchmark);
      } catch (err) {
        logger.error(`[snapshot-job] failed for ${instrument.symbol}:`, err);
      }
      await sleep(DELAY_MS);
    }

    logger.info('[snapshot-job] complete');
  } catch (err) {
    logger.error('[snapshot-job] fatal error:', err);
  }
};

export const startSnapshotCron = (): void => {
  void runSnapshotJob();

  // Runs daily at 23:00 UTC (20:00 Argentina time)
  cron.schedule('0 23 * * *', () => {
    void runSnapshotJob();
  });

  logger.info('[snapshot-job] cron scheduled at 23:00 UTC daily');
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="snapshot-job"
```

Expected: PASS — all 3 tests pass.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/jobs/snapshot-job.ts src/jobs/__tests__/snapshot-job.test.ts
git commit -m "feat(snapshot): add daily price snapshot job with backfill logic"
```

---

### Task 4: Register job in index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Import and register `startSnapshotCron` in `src/index.ts`**

Add the import at the top of `src/index.ts`:

```ts
import { startSnapshotCron } from './jobs/snapshot-job';
```

Add the call inside the `.then()` block in `startApolloServer()`, after `postRoutesMiddleware(app)` and before `app.listen(...)`:

```ts
    // Start daily price snapshot job (runs backfill immediately, then at 23:00 UTC)
    startSnapshotCron();

    app.listen(ENV_VARIABLES.port, () => {
      logger.info(`Listening on port ${ENV_VARIABLES.port}`);
    });
```

The full updated `.then()` block should look like:

```ts
startApolloServer()
  .then(() => {
    RegisterRoutes(app);
    postRoutesMiddleware(app);

    app.use((req, res) => {
      logger.warn(`Route Not Found: ${req.path}`);
      res.status(errors.NOT_FOUND.httpCode).json(errors.NOT_FOUND);
    });

    // Start daily price snapshot job (runs backfill immediately, then at 23:00 UTC)
    startSnapshotCron();

    app.listen(ENV_VARIABLES.port, () => {
      logger.info(`Listening on port ${ENV_VARIABLES.port}`);
    });
  })
  .catch((err: unknown) => {
    logger.error('Failed to start Apollo Server', err);
    process.exit(1);
  });
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat(snapshot): register snapshot cron job at server startup"
```
