# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all issues found in the full Finvest-API code review: 1 critical, 5 important, and 4 suggestions.

**Architecture:** Layered REST + GraphQL — controllers/resolvers → services → repositories → db. All fixes stay inside that layer contract. No new abstractions beyond what's needed.

**Tech Stack:** TypeScript · Node.js 20 · Express 5 · TSOA · Apollo Server 4 · Prisma 7 · PostgreSQL 13 · Zod · Jest

---

## Files to touch

| File | Change |
|---|---|
| `src/config/errors.ts` | Add `code: string` field to each error constant |
| `src/config/api-error.ts` | Add `code: string` to `ErrorInterface` and `ApiError` |
| `src/apollo/resolvers/Mutation.ts` | Use `err.code` instead of `err.errorCode` in extensions |
| `src/apollo/resolvers/Query.ts` | Use `err.code` instead of `err.errorCode` in extensions |
| `src/services/instrument-service.ts` | **Create** — thin wrapper around `InstrumentClient` |
| `src/controllers/instrument-controller.ts` | Import `InstrumentService` instead of `InstrumentClient` |
| `src/services/portfolio-services.ts` | Derive `isFavorite` from DB state after write, not from input |
| `src/services/operation-service.ts` | Accept and propagate `exchange` field |
| `src/apollo/schema/schema.ts` | Add optional `exchange: String` arg to `addTransaction` |
| `src/apollo/resolvers/Mutation.ts` | Pass `exchange` arg through to service |
| `src/repositories/__tests__/holding-repository.test.ts` | Replace `db.portfolio.create` and `db.instrumentClass.upsert` with repositories |
| `src/repositories/__tests__/operation-repository.test.ts` | Replace `db.portfolio.create` and `db.instrumentClass.upsert` with repositories |
| `src/repositories/__tests__/instrument-repository.test.ts` | Replace `db.instrumentClass.upsert` with `InstrumentRepository.findOrCreateClass` |
| `src/services/__tests__/operation-service.test.ts` | Assert specific error code in NOT_FOUND test |
| `src/helpers/holdings.ts` | Add comment explaining DIVIDEND/FEE exclusion |
| `src/config/config.ts` | Replace `z.looseObject` with `z.object` |
| `src/repositories/user-repository.ts` | Exclude `password` from `findMany` result |

---

## Task 1 — Add `code: string` to `ErrorInterface`, `ApiError`, and all error constants

**Files:**
- Modify: `src/config/errors.ts`
- Modify: `src/config/api-error.ts`

This is the foundation for Task 2. The resolver pattern documented in CLAUDE.md expects
`extensions: { code: 'NOT_FOUND', httpCode: err.httpCode }` — a string code, not a number.

- [ ] **Step 1: Update `src/config/errors.ts` to add a string `code` field to every constant**

Replace the entire file with:

```ts
export const errors = {
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    httpCode: 400,
    errorCode: 400_000,
    description: 'Invalid credentials',
  },
  INVALID_USER: {
    code: 'INVALID_USER',
    httpCode: 400,
    errorCode: 400_001,
    description: 'Invalid user',
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    httpCode: 400,
    errorCode: 400_002,
    description: 'Invalid token',
  },
  UNAUTHENTICATED: {
    code: 'UNAUTHENTICATED',
    httpCode: 401,
    errorCode: 401_000,
    description: 'Unauthorized',
  },
  EXPIRED_TOKEN: {
    code: 'EXPIRED_TOKEN',
    httpCode: 401,
    errorCode: 401_001,
    description: 'Token expired',
  },
  INVALID_REFRESH_TOKEN: {
    code: 'INVALID_REFRESH_TOKEN',
    httpCode: 401,
    errorCode: 401_002,
    description: 'Invalid or expired refresh token',
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    httpCode: 404,
    errorCode: 404_000,
    description: 'Not found',
  },
  USER_ALREADY_EXISTS: {
    code: 'USER_ALREADY_EXISTS',
    httpCode: 409,
    errorCode: 409_000,
    description: 'User already exists',
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    httpCode: 422,
    errorCode: 422_000,
    description: 'TSOA Validation error',
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    httpCode: 500,
    errorCode: 500_000,
    description: 'Internal server error',
  },
};
```

- [ ] **Step 2: Update `src/config/api-error.ts` to carry `code` through**

Replace the entire file with:

```ts
export interface ErrorInterface {
  code: string;
  httpCode: number;
  errorCode: number;
  description: string;
}

export class ApiError extends Error {
  code;

  httpCode;

  errorCode;

  constructor(error: ErrorInterface) {
    super(error.description);
    this.code = error.code;
    this.httpCode = error.httpCode;
    this.errorCode = error.errorCode;
  }
}
```

- [ ] **Step 3: Build to confirm no TypeScript errors**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
git checkout -b fix/code-review-fixes
git add src/config/errors.ts src/config/api-error.ts
git commit -m "feat(errors): add string code field to ErrorInterface, ApiError, and all error constants"
```

---

## Task 2 — Fix GraphQL resolvers to use `err.code` (string) in extensions

**Files:**
- Modify: `src/apollo/resolvers/Mutation.ts`
- Modify: `src/apollo/resolvers/Query.ts`

Depends on Task 1 (requires `err.code` to exist on `ApiError`).

- [ ] **Step 1: Update every `catch` block in `Mutation.ts`**

There are three mutations: `createPortfolio`, `setFavoritePortfolio`, `addTransaction`.
In each, change:

```ts
// Before
extensions: { code: err.errorCode, httpCode: err.httpCode },
```

```ts
// After
extensions: { code: err.code, httpCode: err.httpCode },
```

The file already has correct string codes for the unauthenticated guards (`'UNAUTHENTICATED'`).
Only the `ApiError` catch blocks need updating — there are three of them.

- [ ] **Step 2: Update every `catch` block in `Query.ts`**

There are two queries: `portfolios`, `portfolioDetail`. Same change:

```ts
// Before
extensions: { code: err.errorCode, httpCode: err.httpCode },
```

```ts
// After
extensions: { code: err.code, httpCode: err.httpCode },
```

- [ ] **Step 3: Build to confirm no TypeScript errors**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/apollo/resolvers/Mutation.ts src/apollo/resolvers/Query.ts
git commit -m "fix(graphql): use err.code (string) instead of err.errorCode (number) in resolver extensions"
```

---

## Task 3 — Create `InstrumentService` and wire `InstrumentController` through it

**Files:**
- Create: `src/services/instrument-service.ts`
- Modify: `src/controllers/instrument-controller.ts`

The controller currently imports `InstrumentClient` directly, bypassing the service layer.
`InstrumentService` wraps both client calls. The controller calls the service.

- [ ] **Step 1: Create `src/services/instrument-service.ts`**

```ts
import { InstrumentClient, InstrumentSearchResult } from '@clients/twelve-data-client';

export const InstrumentService = {
  search: (query: string): Promise<InstrumentSearchResult[]> => InstrumentClient.search(query),

  getQuote: (symbol: string): Promise<number> => InstrumentClient.getQuote(symbol),
};
```

- [ ] **Step 2: Update `src/controllers/instrument-controller.ts`**

Replace the entire file with:

```ts
import { Controller, Get, Query, Route, Security, Path } from '@tsoa/runtime';
import { InstrumentSearchResult } from '@clients/twelve-data-client';
import { InstrumentService } from '@services/instrument-service';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';

interface QuoteResponse {
  symbol: string;
  price: number;
}

@Route('instruments')
export class InstrumentController extends Controller {
  /**
   * Search for instruments by symbol, name, or ISIN via TwelveData.
   * @summary Search instruments
   */
  @Security('jwt')
  @Get('/search')
  public async searchInstruments(@Query() q: string): Promise<InstrumentSearchResult[]> {
    if (!q || q.trim().length === 0) {
      throw new ApiError(errors.VALIDATION_ERROR);
    }

    return InstrumentService.search(q.trim());
  }

  /**
   * Get the current market price for a symbol via TwelveData.
   * @summary Get instrument quote
   */
  @Security('jwt')
  @Get('/quote/{symbol}')
  public async getQuote(@Path() symbol: string): Promise<QuoteResponse> {
    const price = await InstrumentService.getQuote(symbol);
    return { symbol, price };
  }
}
```

- [ ] **Step 3: Build to confirm no TypeScript errors**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/instrument-service.ts src/controllers/instrument-controller.ts
git commit -m "refactor(instruments): introduce InstrumentService, controller no longer imports client directly"
```

---

## Task 4 — Fix `createPortfolio` to derive `isFavorite` from DB state

**Files:**
- Modify: `src/services/portfolio-services.ts`

Currently `isFavorite` is returned as `!!isFavorite` (from the input arg). If `isFavorite` was
requested, the `createAndSetFavorite` transaction updated `user.favoritePortfolioId`. We
derive the truth by reading the user after the write.

- [ ] **Step 1: Update `createPortfolio` in `src/services/portfolio-services.ts`**

Replace the `createPortfolio` method (lines 12–29):

```ts
createPortfolio: async (
  userId: number,
  name: string,
  description?: string,
  isFavorite?: boolean,
): Promise<Portfolio> => {
  const portfolio = isFavorite
    ? await PortfolioRepository.createAndSetFavorite({ name, description, userId })
    : await PortfolioRepository.create({ name, description, userId });

  const user = await UserRepository.findById(userId);

  return {
    id: portfolio.id,
    name: portfolio.name,
    description: portfolio.description ?? null,
    createdAt: portfolio.createdAt.toISOString(),
    isFavorite: user?.favoritePortfolioId === portfolio.id,
  };
},
```

- [ ] **Step 2: Run portfolio service tests**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx jest src/services/__tests__/portfolio-services.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/services/portfolio-services.ts
git commit -m "fix(portfolio): derive isFavorite from DB state after write instead of input arg"
```

---

## Task 5 — Add `exchange` field to `addTransaction` (schema + service + resolver)

**Files:**
- Modify: `src/apollo/schema/schema.ts`
- Modify: `src/services/operation-service.ts`
- Modify: `src/apollo/resolvers/Mutation.ts`

Currently `exchange` is hardcoded as `''` in `OperationService.addTransaction`. The instrument
search endpoint already returns `exchange`. Making it an optional field in the mutation lets the
frontend pass it through when available.

- [ ] **Step 1: Add `exchange: String` to the `addTransaction` mutation in `src/apollo/schema/schema.ts`**

In the `Mutation` type, change `addTransaction` args from:

```graphql
addTransaction(
  portfolioId: Int!
  side: OperationSide!
  symbol: String!
  name: String!
  instrumentClass: String!
  country: String
  date: String!
  price: Float!
  quantity: Float!
): Holding!
```

To:

```graphql
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
```

- [ ] **Step 2: Update `OperationService.addTransaction` params in `src/services/operation-service.ts`**

Add `exchange?: string` to the params object and pass it to `InstrumentRepository.findOrCreate`:

Change the params type (around line 23):

```ts
addTransaction: async (params: {
  userId: number;
  portfolioId: number;
  side: OperationType;
  symbol: string;
  name: string;
  instrumentClass: string;
  exchange?: string;
  country?: string;
  date: string;
  price: number;
  quantity: number;
}): Promise<HoldingDTO> => {
```

Change the `findOrCreate` call (around line 44):

```ts
const instrument = await InstrumentRepository.findOrCreate({
  symbol: params.symbol,
  name: params.name,
  exchange: params.exchange ?? '',
  country: params.country,
  instrumentClassId: instrumentClass.id,
});
```

- [ ] **Step 3: Update `addTransaction` resolver in `src/apollo/resolvers/Mutation.ts`**

Add `exchange?: string` to the args type and pass it to the service. Change the args object (around line 63):

```ts
addTransaction: async (
  _: unknown,
  args: {
    portfolioId: number;
    side: OperationType;
    symbol: string;
    name: string;
    instrumentClass: string;
    exchange?: string;
    country?: string;
    date: string;
    price: number;
    quantity: number;
  },
  context: ApolloContext,
) => {
```

The `...args` spread already passes all fields, so no change needed in the service call body.

- [ ] **Step 4: Build to confirm no TypeScript errors**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run operation service tests**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx jest src/services/__tests__/operation-service.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/apollo/schema/schema.ts src/services/operation-service.ts src/apollo/resolvers/Mutation.ts
git commit -m "feat(transaction): propagate exchange field through addTransaction mutation and service"
```

---

## Task 6 — Fix repository test fixtures to use repositories instead of `db`

**Files:**
- Modify: `src/repositories/__tests__/holding-repository.test.ts`
- Modify: `src/repositories/__tests__/operation-repository.test.ts`
- Modify: `src/repositories/__tests__/instrument-repository.test.ts`

These tests import `db` to create test fixtures (portfolios, instrumentClass). They should
use `PortfolioRepository.create` and `InstrumentRepository.findOrCreateClass` instead.

- [ ] **Step 1: Update `holding-repository.test.ts`**

Replace the entire file:

```ts
import { HoldingRepository } from '@repositories/holding-repository';
import { InstrumentRepository } from '@repositories/instrument-repository';
import { PortfolioRepository } from '@repositories/portfolio-repository';
import { OperationRepository } from '@repositories/operation-repository';
import { UserRepository } from '@repositories/user-repository';
import { hashPassword } from '@helpers/password';

const createTestUser = async () => {
  const email = `holding.repo.${Date.now()}@test.com`;
  return UserRepository.create({
    email,
    password: await hashPassword('password123'),
    firstName: 'Test',
    lastName: 'User',
  });
};

const createTestPortfolio = async (userId: number) =>
  PortfolioRepository.create({ name: 'Test Portfolio', userId });

const createTestInstrument = async (symbol: string) => {
  const cls = await InstrumentRepository.findOrCreateClass('Stock');
  return InstrumentRepository.findOrCreate({
    symbol,
    name: `${symbol} Corp.`,
    exchange: 'NASDAQ',
    instrumentClassId: cls.id,
  });
};

describe('HoldingRepository', () => {
  describe('findOrCreate', () => {
    it('creates a holding when one does not exist', async () => {
      const user = await createTestUser();
      const portfolio = await createTestPortfolio(user.id);
      const instrument = await createTestInstrument(`HOLD${Date.now()}`);

      const holding = await HoldingRepository.findOrCreate({
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
      });

      expect(holding.portfolioId).toBe(portfolio.id);
      expect(holding.instrumentId).toBe(instrument.id);
    });

    it('returns existing holding when called twice', async () => {
      const user = await createTestUser();
      const portfolio = await createTestPortfolio(user.id);
      const instrument = await createTestInstrument(`HOLD2${Date.now()}`);

      const a = await HoldingRepository.findOrCreate({
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
      });
      const b = await HoldingRepository.findOrCreate({
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
      });

      expect(a.id).toBe(b.id);
    });
  });

  describe('findByPortfolioWithDetails', () => {
    it('returns holdings with instrument and operations included', async () => {
      const user = await createTestUser();
      const portfolio = await createTestPortfolio(user.id);
      const instrument = await createTestInstrument(`HOLD3${Date.now()}`);
      const holding = await HoldingRepository.findOrCreate({
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
      });

      await OperationRepository.create({
        holdingId: holding.id,
        type: 'BUY',
        quantity: 10,
        price: 150,
        date: new Date(),
      });

      const holdings = await HoldingRepository.findByPortfolioWithDetails(portfolio.id);
      expect(holdings).toHaveLength(1);
      expect(holdings[0].instrument.symbol).toBe(instrument.symbol);
      expect(holdings[0].operations).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Update `operation-repository.test.ts`**

Replace the entire file:

```ts
import { OperationRepository } from '@repositories/operation-repository';
import { HoldingRepository } from '@repositories/holding-repository';
import { InstrumentRepository } from '@repositories/instrument-repository';
import { PortfolioRepository } from '@repositories/portfolio-repository';
import { UserRepository } from '@repositories/user-repository';
import { hashPassword } from '@helpers/password';

const setup = async () => {
  const email = `op.repo.${Date.now()}@test.com`;
  const user = await UserRepository.create({
    email,
    password: await hashPassword('password123'),
    firstName: 'Op',
    lastName: 'Test',
  });
  const portfolio = await PortfolioRepository.create({ name: 'Test', userId: user.id });
  const cls = await InstrumentRepository.findOrCreateClass('Stock');
  const instrument = await InstrumentRepository.findOrCreate({
    symbol: `OPREPO${Date.now()}`,
    name: 'Op Repo Corp.',
    exchange: 'NYSE',
    instrumentClassId: cls.id,
  });
  const holding = await HoldingRepository.findOrCreate({
    portfolioId: portfolio.id,
    instrumentId: instrument.id,
  });
  return { holding };
};

describe('OperationRepository', () => {
  describe('create', () => {
    it('creates a BUY operation with correct fields', async () => {
      const { holding } = await setup();
      const date = new Date('2026-04-25');

      const op = await OperationRepository.create({
        holdingId: holding.id,
        type: 'BUY',
        quantity: 5,
        price: 150.25,
        date,
      });

      expect(op.holdingId).toBe(holding.id);
      expect(op.type).toBe('BUY');
      expect(Number(op.quantity)).toBe(5);
      expect(Number(op.price)).toBeCloseTo(150.25);
    });
  });
});
```

- [ ] **Step 3: Update `instrument-repository.test.ts`**

Replace `seedInstrumentClass` to use `InstrumentRepository.findOrCreateClass`:

```ts
import { InstrumentRepository } from '@repositories/instrument-repository';

const seedInstrumentClass = async (name = 'Stock') =>
  InstrumentRepository.findOrCreateClass(name);

// rest of file unchanged
```

The full file after the change:

```ts
import { InstrumentRepository } from '@repositories/instrument-repository';

const seedInstrumentClass = async (name = 'Stock') =>
  InstrumentRepository.findOrCreateClass(name);

describe('InstrumentRepository', () => {
  describe('findOrCreateClass', () => {
    it('creates an InstrumentClass when it does not exist', async () => {
      const cls = await InstrumentRepository.findOrCreateClass('Crypto');
      expect(cls.name).toBe('Crypto');
      expect(cls.id).toBeGreaterThan(0);
    });

    it('returns existing InstrumentClass when called twice with same name', async () => {
      const a = await InstrumentRepository.findOrCreateClass('ETF');
      const b = await InstrumentRepository.findOrCreateClass('ETF');
      expect(a.id).toBe(b.id);
    });
  });

  describe('findOrCreate', () => {
    it('creates an Instrument when it does not exist', async () => {
      const cls = await seedInstrumentClass();
      const instrument = await InstrumentRepository.findOrCreate({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        instrumentClassId: cls.id,
      });
      expect(instrument.symbol).toBe('AAPL');
      expect(instrument.name).toBe('Apple Inc.');
    });

    it('returns existing Instrument when called twice with same symbol', async () => {
      const cls = await seedInstrumentClass();
      const a = await InstrumentRepository.findOrCreate({
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        exchange: 'NASDAQ',
        instrumentClassId: cls.id,
      });
      const b = await InstrumentRepository.findOrCreate({
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        exchange: 'NASDAQ',
        instrumentClassId: cls.id,
      });
      expect(a.id).toBe(b.id);
    });

    it('persists country when provided', async () => {
      const cls = await seedInstrumentClass();
      const instrument = await InstrumentRepository.findOrCreate({
        symbol: 'NVO',
        name: 'Novo Nordisk A/S',
        exchange: 'NYSE',
        country: 'DK',
        instrumentClassId: cls.id,
      });
      expect(instrument.country).toBe('DK');
    });

    it('stores null country when not provided', async () => {
      const cls = await seedInstrumentClass();
      const instrument = await InstrumentRepository.findOrCreate({
        symbol: 'NOCOUNTRY',
        name: 'No Country Corp.',
        exchange: 'NYSE',
        instrumentClassId: cls.id,
      });
      expect(instrument.country).toBeNull();
    });
  });

  describe('findBySymbol', () => {
    it('returns null when symbol does not exist', async () => {
      const result = await InstrumentRepository.findBySymbol('DOES_NOT_EXIST');
      expect(result).toBeNull();
    });

    it('returns the instrument when symbol exists', async () => {
      const cls = await seedInstrumentClass();
      await InstrumentRepository.findOrCreate({
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        exchange: 'NASDAQ',
        instrumentClassId: cls.id,
      });
      const result = await InstrumentRepository.findBySymbol('TSLA');
      expect(result?.symbol).toBe('TSLA');
    });
  });
});
```

- [ ] **Step 4: Run repository tests**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx jest src/repositories/__tests__ --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/repositories/__tests__/holding-repository.test.ts \
        src/repositories/__tests__/operation-repository.test.ts \
        src/repositories/__tests__/instrument-repository.test.ts
git commit -m "test(repositories): replace direct db imports in fixtures with repository methods"
```

---

## Task 7 — Fix NOT_FOUND test assertion in operation service

**Files:**
- Modify: `src/services/__tests__/operation-service.test.ts`

The test at line 89 only asserts `.rejects.toThrow()`. It should assert the specific error code
as the other service tests do.

- [ ] **Step 1: Update the NOT_FOUND test in `src/services/__tests__/operation-service.test.ts`**

Import `errors` and `ApiError` at the top of the file (add after existing imports):

```ts
import { errors } from '@config/errors';
import { ApiError } from '@config/api-error';
```

Change the test body from:

```ts
it('throws NOT_FOUND when portfolio does not belong to user', async () => {
  const user = await createTestUser();
  const otherUser = await createTestUser();
  const portfolio = await PortfolioRepository.create({ name: 'Other', userId: otherUser.id });

  await expect(
    OperationService.addTransaction({
      userId: user.id,
      portfolioId: portfolio.id,
      side: 'BUY',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      instrumentClass: 'Stock',
      date: '2026-04-25',
      price: 100,
      quantity: 1,
    }),
  ).rejects.toThrow();
});
```

To:

```ts
it('throws NOT_FOUND when portfolio does not belong to user', async () => {
  const user = await createTestUser();
  const otherUser = await createTestUser();
  const portfolio = await PortfolioRepository.create({ name: 'Other', userId: otherUser.id });

  await expect(
    OperationService.addTransaction({
      userId: user.id,
      portfolioId: portfolio.id,
      side: 'BUY',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      instrumentClass: 'Stock',
      date: '2026-04-25',
      price: 100,
      quantity: 1,
    }),
  ).rejects.toSatisfy(
    (err: unknown) => err instanceof ApiError && err.errorCode === errors.NOT_FOUND.errorCode,
  );
});
```

- [ ] **Step 2: Run operation service tests**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx jest src/services/__tests__/operation-service.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/services/__tests__/operation-service.test.ts
git commit -m "test(operation): assert specific NOT_FOUND error code instead of generic toThrow"
```

---

## Task 8 — Three small fixes: holdings comment, z.looseObject, UserRepository.findMany

**Files:**
- Modify: `src/helpers/holdings.ts`
- Modify: `src/config/config.ts`
- Modify: `src/repositories/user-repository.ts`

Grouping these three minor/suggestion fixes into a single commit.

- [ ] **Step 1: Add comment to `src/helpers/holdings.ts` explaining DIVIDEND/FEE exclusion**

In `computeHoldingMetrics`, add a comment before the filter lines:

```ts
export const computeHoldingMetrics = (operations: OperationLike[]): HoldingMetrics => {
  // DIVIDEND and FEE operations are intentionally excluded: dividends are not reinvested
  // and fees are not capitalized into cost basis at this stage.
  const buyOps = operations.filter((op) => op.type === OperationType.BUY);
  const sellOps = operations.filter((op) => op.type === OperationType.SELL);
  // ... rest unchanged
```

Full updated file:

```ts
import { Decimal } from '@prisma/client-runtime-utils';
import { OperationType } from '@generated/prisma';

interface OperationLike {
  type: OperationType;
  quantity: Decimal;
  price: Decimal;
}

export interface HoldingMetrics {
  quantity: number;
  avgCost: number;
}

export const computeHoldingMetrics = (operations: OperationLike[]): HoldingMetrics => {
  // DIVIDEND and FEE operations are intentionally excluded: dividends are not reinvested
  // and fees are not capitalized into cost basis at this stage.
  const buyOps = operations.filter((op) => op.type === OperationType.BUY);
  const sellOps = operations.filter((op) => op.type === OperationType.SELL);

  const totalBuyQty = buyOps.reduce((sum, op) => sum + Number(op.quantity), 0);
  const totalSellQty = sellOps.reduce((sum, op) => sum + Number(op.quantity), 0);
  const quantity = totalBuyQty - totalSellQty;

  const totalBuyCost = buyOps.reduce((sum, op) => sum + Number(op.price) * Number(op.quantity), 0);
  const avgCost = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;

  return { quantity, avgCost };
};
```

- [ ] **Step 2: Replace `z.looseObject` with `z.object` in `src/config/config.ts`**

Change line 16:

```ts
// Before
const envVariablesSchema = z.looseObject({

// After
const envVariablesSchema = z.object({
```

- [ ] **Step 3: Exclude `password` from `UserRepository.findMany` in `src/repositories/user-repository.ts`**

Change line 5:

```ts
// Before
findMany: () => db.user.findMany(),

// After
findMany: () => db.user.findMany({ select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, updatedAt: true, favoritePortfolioId: true } }),
```

- [ ] **Step 4: Build to confirm no TypeScript errors**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run full test suite**

```bash
cd d:/GIT_MIS_PROYECTOS/finvest/Finvest-API
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/helpers/holdings.ts src/config/config.ts src/repositories/user-repository.ts
git commit -m "fix: add DIVIDEND/FEE comment, strict env schema, exclude password from UserRepository.findMany"
```

---

## Self-review

**Spec coverage check:**
- Critical #1 (err.code string) → Tasks 1 + 2 ✓
- Important #2 (test fixtures import db) → Task 6 ✓
- Important #3 (OperationSide enum not tied to OperationType) → Not addressed — see note below
- Important #4 (controller bypasses service) → Task 3 ✓
- Important #5 (isFavorite from input) → Task 4 ✓
- Important #6 (exchange hardcoded) → Task 5 ✓
- Suggestion #7 (NOT_FOUND test) → Task 7 ✓
- Suggestion #8 (DIVIDEND/FEE comment) → Task 8 ✓
- Suggestion #9 (z.looseObject) → Task 8 ✓
- Suggestion #10 (findMany password) → Task 8 ✓

**Note on Important #3 (OperationSide vs OperationType):** The reviewer flagged that the GraphQL schema's `OperationSide { BUY, SELL }` enum is not formally tied to Prisma's `OperationType`. However, GraphQL itself validates that the incoming value is one of `BUY` or `SELL` — values outside the enum are rejected at the GraphQL layer before the resolver runs. The resolver types the arg as `OperationType` which is a superset; this is a TypeScript-only annotation gap but not a runtime risk. The fix (rename schema enum, or add a cast) is cosmetic and would require a frontend schema update. Deferred as out of scope for this batch.
