# Portfolio Performance GraphQL Query — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose a `portfolioPerformance(portfolioId, range)` GraphQL query that returns daily portfolio value and normalized % returns vs SPX and NDX for a given time range.

**Architecture:** A new `PortfolioPerformanceService` handles all calculation logic — it loads holdings with operations and price snapshots, computes holdings quantity per day, and normalizes returns from the first day of the range. The resolver follows the existing thin pattern: check auth → call service → handle ApiError.

**Prerequisite:** Part 1 (snapshot job) must be complete. `PriceSnapshotRepository` and `InstrumentRepository` must exist.

**Tech Stack:** Apollo Server (existing), Prisma (existing), TypeScript.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/services/portfolio-performance-service.ts` |
| Modify | `src/apollo/schema/schema.ts` — add enum + type + query |
| Modify | `src/apollo/resolvers/Query.ts` — add `portfolioPerformance` resolver |
| Create | `src/services/__tests__/portfolio-performance-service.test.ts` |

---

### Task 1: PortfolioPerformanceService

**Files:**
- Create: `src/services/portfolio-performance-service.ts`
- Create: `src/services/__tests__/portfolio-performance-service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/portfolio-performance-service.test.ts`:

```ts
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
      where: { name: 'Stock' }, update: {}, create: { name: 'Stock' },
    });
    const indexClass = await db.instrumentClass.upsert({
      where: { name: 'Index' }, update: {}, create: { name: 'Index' },
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
      create: { symbol: '__PERF_AAPL__', name: 'AAPL Test', exchange: 'NASDAQ', country: 'US', instrumentClassId: stockClass.id },
    });
    aaplId = aapl.id;

    const spx = await db.instrument.upsert({
      where: { symbol: '__PERF_SPX__' },
      update: {},
      create: { symbol: '__PERF_SPX__', name: 'SPX Test', exchange: 'NYSE', country: 'US', instrumentClassId: indexClass.id },
    });
    spxId = spx.id;

    const ndx = await db.instrument.upsert({
      where: { symbol: '__PERF_NDX__' },
      update: {},
      create: { symbol: '__PERF_NDX__', name: 'NDX Test', exchange: 'NASDAQ', country: 'US', instrumentClassId: indexClass.id },
    });
    ndxId = ndx.id;

    const holding = await db.holding.create({
      data: { portfolioId, instrumentId: aaplId },
    });

    // BUY 10 shares on Jan 1
    await db.operation.create({
      data: {
        holdingId: holding.id,
        type: 'BUY',
        quantity: 10,
        price: 150,
        date: new Date('2026-01-01T14:00:00Z'),
      },
    });

    // Snapshots for 3 days
    await db.priceSnapshot.createMany({
      data: [
        { instrumentId: aaplId, date: new Date('2026-01-01'), closePrice: 150 },
        { instrumentId: aaplId, date: new Date('2026-01-02'), closePrice: 160 },
        { instrumentId: aaplId, date: new Date('2026-01-03'), closePrice: 155 },
        { instrumentId: spxId,  date: new Date('2026-01-01'), closePrice: 5000 },
        { instrumentId: spxId,  date: new Date('2026-01-02'), closePrice: 5100 },
        { instrumentId: spxId,  date: new Date('2026-01-03'), closePrice: 5050 },
        { instrumentId: ndxId,  date: new Date('2026-01-01'), closePrice: 20000 },
        { instrumentId: ndxId,  date: new Date('2026-01-02'), closePrice: 20200 },
        { instrumentId: ndxId,  date: new Date('2026-01-03'), closePrice: 20100 },
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
    // Override SPX/NDX symbol lookup to use test instruments
    const result = await PortfolioPerformanceService.getPerformance(
      portfolioId,
      userId,
      'ONE_MONTH',
      { spxSymbol: '__PERF_SPX__', ndxSymbol: '__PERF_NDX__' },
    );

    expect(result.length).toBe(3);

    // Day 1: base (0% return for all)
    expect(result[0].portfolioValue).toBe(1500);   // 10 × 150
    expect(result[0].portfolioReturnPct).toBe(0);
    expect(result[0].spxReturnPct).toBe(0);
    expect(result[0].ndxReturnPct).toBe(0);

    // Day 2: AAPL 160 → +6.67%, SPX 5100 → +2%, NDX 20200 → +1%
    expect(result[1].portfolioValue).toBe(1600);   // 10 × 160
    expect(result[1].portfolioReturnPct).toBeCloseTo(6.667, 2);
    expect(result[1].spxReturnPct).toBeCloseTo(2, 2);
    expect(result[1].ndxReturnPct).toBeCloseTo(1, 2);
  });

  it('throws NOT_FOUND when portfolio does not belong to user', async () => {
    await expect(
      PortfolioPerformanceService.getPerformance(portfolioId, 99999, 'ONE_MONTH'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns empty array when no snapshots exist for range', async () => {
    const result = await PortfolioPerformanceService.getPerformance(
      portfolioId,
      userId,
      'ONE_YEAR',
      { spxSymbol: '__PERF_SPX__', ndxSymbol: '__PERF_NDX__' },
    );
    // Snapshots only exist for 2026-01-01 to 2026-01-03; ONE_YEAR goes back ~365 days
    // Only 3 points should be returned
    expect(result.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="portfolio-performance-service"
```

Expected: FAIL with "Cannot find module '../portfolio-performance-service'".

- [ ] **Step 3: Create `src/services/portfolio-performance-service.ts`**

```ts
import { PortfolioRepository } from '@repositories/portfolio-repository';
import { HoldingRepository } from '@repositories/holding-repository';
import { PriceSnapshotRepository } from '@repositories/price-snapshot-repository';
import { InstrumentRepository } from '@repositories/instrument-repository';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { OperationType } from '@generated/prisma';

export type PortfolioRangeInput =
  | 'ONE_MONTH'
  | 'THREE_MONTHS'
  | 'YEAR_TO_DATE'
  | 'ONE_YEAR'
  | 'ALL';

export interface PortfolioPerformancePoint {
  date: string;
  portfolioValue: number;
  portfolioReturnPct: number;
  spxReturnPct: number;
  ndxReturnPct: number;
}

// Symbols can be overridden in tests to use fixture instruments instead of real SPX/NDX
interface BenchmarkSymbols {
  spxSymbol?: string;
  ndxSymbol?: string;
}

const resolveStartDate = (range: PortfolioRangeInput, earliestOperationDate: Date | null): Date => {
  const now = new Date();
  switch (range) {
    case 'ONE_MONTH': {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() - 1);
      return d;
    }
    case 'THREE_MONTHS': {
      const d = new Date(now);
      d.setUTCMonth(d.getUTCMonth() - 3);
      return d;
    }
    case 'YEAR_TO_DATE': {
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }
    case 'ONE_YEAR': {
      const d = new Date(now);
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      return d;
    }
    case 'ALL': {
      return earliestOperationDate ?? new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    }
  }
};

// Counts shares held at a given date by summing BUY/SELL operations on or before that date.
// Compares calendar day only (ignores time) so a BUY at 14:30 counts for that day's EOD snapshot.
const computeQuantityAtDate = (
  operations: Array<{ type: OperationType; quantity: { toNumber: () => number }; date: Date }>,
  snapshotDate: Date,
): number => {
  return operations
    .filter((op) => {
      const opDay = new Date(op.date);
      opDay.setUTCHours(0, 0, 0, 0);
      return opDay <= snapshotDate && (op.type === OperationType.BUY || op.type === OperationType.SELL);
    })
    .reduce((sum, op) => {
      return op.type === OperationType.BUY
        ? sum + op.quantity.toNumber()
        : sum - op.quantity.toNumber();
    }, 0);
};

const normalizeReturnPct = (current: number, base: number): number => {
  if (base === 0) return 0;
  return ((current - base) / base) * 100;
};

export const PortfolioPerformanceService = {
  getPerformance: async (
    portfolioId: number,
    userId: number,
    range: PortfolioRangeInput,
    benchmarks: BenchmarkSymbols = {},
  ): Promise<PortfolioPerformancePoint[]> => {
    const portfolio = await PortfolioRepository.findById(portfolioId);
    if (!portfolio || portfolio.userId !== userId) {
      throw new ApiError(errors.NOT_FOUND);
    }

    const spxSymbol = benchmarks.spxSymbol ?? 'SPX';
    const ndxSymbol = benchmarks.ndxSymbol ?? 'NDX';

    const holdingsWithDetails = await HoldingRepository.findByPortfolioWithDetails(portfolioId);
    if (holdingsWithDetails.length === 0) return [];

    // Find earliest operation date across all holdings for ALL range resolution
    const allOperationDates = holdingsWithDetails.flatMap((h) => h.operations.map((op) => op.date));
    const earliestOperationDate = allOperationDates.length > 0
      ? new Date(Math.min(...allOperationDates.map((d) => d.getTime())))
      : null;

    const startDate = resolveStartDate(range, earliestOperationDate);
    const endDate = new Date();
    endDate.setUTCHours(0, 0, 0, 0);

    // Load benchmark instruments
    const benchmarkInstruments = await InstrumentRepository.findBySymbols([spxSymbol, ndxSymbol]);
    const spxInstrument = benchmarkInstruments.find((i) => i.symbol === spxSymbol);
    const ndxInstrument = benchmarkInstruments.find((i) => i.symbol === ndxSymbol);

    const portfolioInstrumentIds = holdingsWithDetails.map((h) => h.instrumentId);
    const allIds = [
      ...portfolioInstrumentIds,
      ...(spxInstrument ? [spxInstrument.id] : []),
      ...(ndxInstrument ? [ndxInstrument.id] : []),
    ];

    const snapshots = await PriceSnapshotRepository.findByInstrumentIdsAndDateRange(
      allIds,
      startDate,
      endDate,
    );

    if (snapshots.length === 0) return [];

    // Group snapshots by date string then by instrumentId for fast lookup
    const snapshotsByDate = new Map<string, Map<number, number>>();
    for (const snap of snapshots) {
      const dateKey = snap.date.toISOString().slice(0, 10);
      if (!snapshotsByDate.has(dateKey)) snapshotsByDate.set(dateKey, new Map());
      snapshotsByDate.get(dateKey)!.set(snap.instrumentId, Number(snap.closePrice));
    }

    // Compute portfolio value per day
    const points: Array<{ date: string; portfolioValue: number; spxClose: number; ndxClose: number }> = [];

    for (const [dateKey, priceMap] of snapshotsByDate) {
      const snapshotDate = new Date(`${dateKey}T00:00:00Z`);

      let portfolioValue = 0;
      for (const holding of holdingsWithDetails) {
        const price = priceMap.get(holding.instrumentId);
        if (price == null) continue;
        const qty = computeQuantityAtDate(holding.operations, snapshotDate);
        if (qty > 0) portfolioValue += qty * price;
      }

      const spxClose = spxInstrument ? (priceMap.get(spxInstrument.id) ?? 0) : 0;
      const ndxClose = ndxInstrument ? (priceMap.get(ndxInstrument.id) ?? 0) : 0;

      points.push({ date: dateKey, portfolioValue, spxClose, ndxClose });
    }

    points.sort((a, b) => a.date.localeCompare(b.date));

    if (points.length === 0) return [];

    const basePortfolio = points[0].portfolioValue;
    const baseSpx = points[0].spxClose;
    const baseNdx = points[0].ndxClose;

    return points.map((p) => ({
      date: p.date,
      portfolioValue: p.portfolioValue,
      portfolioReturnPct: normalizeReturnPct(p.portfolioValue, basePortfolio),
      spxReturnPct: normalizeReturnPct(p.spxClose, baseSpx),
      ndxReturnPct: normalizeReturnPct(p.ndxClose, baseNdx),
    }));
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="portfolio-performance-service"
```

Expected: PASS — all 3 tests pass.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/portfolio-performance-service.ts src/services/__tests__/portfolio-performance-service.test.ts
git commit -m "feat(performance): add PortfolioPerformanceService"
```

---

### Task 2: GraphQL schema additions

**Files:**
- Modify: `src/apollo/schema/schema.ts`

- [ ] **Step 1: Add enum, type, and query to the schema**

In `src/apollo/schema/schema.ts`, update `typeDefs` to add the new definitions.

Add after the `OperationSide` enum:

```graphql
  enum PortfolioRange {
    ONE_MONTH
    THREE_MONTHS
    YEAR_TO_DATE
    ONE_YEAR
    ALL
  }

  type PortfolioPerformancePoint {
    date: String!
    portfolioValue: Float!
    portfolioReturnPct: Float!
    spxReturnPct: Float!
    ndxReturnPct: Float!
  }
```

Add to the `Query` type:

```graphql
    # Returns daily portfolio value and % returns vs SPX and NDX for the given range.
    portfolioPerformance(portfolioId: Int!, range: PortfolioRange!): [PortfolioPerformancePoint!]!
```

The final schema block should look like:

```ts
export const typeDefs = `#graphql
  type Portfolio {
    id: Int!
    name: String!
    description: String
    createdAt: String!
    isFavorite: Boolean!
  }

  type Instrument {
    symbol: String!
    name: String!
    instrumentClass: String!
    country: String
  }

  type Holding {
    id: Int!
    instrument: Instrument!
    quantity: Float!
    avgCost: Float!
    realizedPnl: Float!
  }

  type PortfolioDetail {
    id: Int!
    name: String!
    description: String
    holdings: [Holding!]!
    realizedPnl: Float!
  }

  enum OperationSide {
    BUY
    SELL
  }

  enum PortfolioRange {
    ONE_MONTH
    THREE_MONTHS
    YEAR_TO_DATE
    ONE_YEAR
    ALL
  }

  type PortfolioPerformancePoint {
    date: String!
    portfolioValue: Float!
    portfolioReturnPct: Float!
    spxReturnPct: Float!
    ndxReturnPct: Float!
  }

  type Query {
    # Returns the portfolios owned by the authenticated user.
    portfolios: [Portfolio!]!
    # Returns detail (holdings) for a single portfolio owned by the authenticated user.
    portfolioDetail(id: Int!): PortfolioDetail
    # Returns daily portfolio value and % returns vs SPX and NDX for the given range.
    portfolioPerformance(portfolioId: Int!, range: PortfolioRange!): [PortfolioPerformancePoint!]!
  }

  type Mutation {
    # Creates a new portfolio. If isFavorite is true, replaces any existing favorite.
    createPortfolio(name: String!, description: String, isFavorite: Boolean): Portfolio!
    # Sets the favorite portfolio for the authenticated user. Pass null to unset.
    setFavoritePortfolio(portfolioId: Int): Portfolio
    # Records a BUY or SELL transaction and returns the updated Holding.
    addTransaction(
      portfolioId: Int!
      side: OperationSide!
      symbol: String!
      name: String!
      instrumentClass: String!
      exchange: String
      country: String
      date: String!
      price: Float!
      quantity: Float!
    ): Holding!
  }
`;
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/apollo/schema/schema.ts
git commit -m "feat(performance): add PortfolioPerformance types to GraphQL schema"
```

---

### Task 3: Query resolver

**Files:**
- Modify: `src/apollo/resolvers/Query.ts`

- [ ] **Step 1: Add `portfolioPerformance` resolver to `Query.ts`**

Add the import at the top of `src/apollo/resolvers/Query.ts`:

```ts
import { PortfolioPerformanceService, PortfolioRangeInput } from '@services/portfolio-performance-service';
```

Add this resolver to the `Query` object (after `portfolioDetail`):

```ts
  portfolioPerformance: async (
    _: unknown,
    args: { portfolioId: number; range: PortfolioRangeInput },
    context: ApolloContext,
  ) => {
    if (!context.user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED', httpCode: 401 },
      });
    }

    try {
      return await PortfolioPerformanceService.getPerformance(
        args.portfolioId,
        context.user.userId,
        args.range,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        throw new GraphQLError(err.message, {
          extensions: { code: err.code, httpCode: err.httpCode },
        });
      }
      throw err;
    }
  },
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
git add src/apollo/resolvers/Query.ts
git commit -m "feat(performance): add portfolioPerformance GraphQL resolver"
```
