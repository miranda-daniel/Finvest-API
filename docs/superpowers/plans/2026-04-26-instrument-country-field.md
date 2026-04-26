# Instrument `country` Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing `country` DB column through the full stack so it is saved on instrument creation and returned in holding queries.

**Architecture:** The `country` field already exists as `String?` in the Prisma schema — no migration needed. Changes flow bottom-up: repository → service → GraphQL schema → resolver. `country` is optional at every layer.

**Tech Stack:** TypeScript, Prisma 7, Apollo Server 4, Jest (integration tests against real DB)

---

### Task 1: Extend `InstrumentRepository.findOrCreate` to accept `country`

**Files:**
- Modify: `src/repositories/instrument-repository.ts`
- Modify: `src/repositories/__tests__/instrument-repository.test.ts`

- [ ] **Step 1: Add a failing test for `country` persistence**

Add this test inside the existing `describe('findOrCreate')` block in `src/repositories/__tests__/instrument-repository.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm test -- --testPathPattern="instrument-repository" --no-coverage
```

Expected: TypeScript error — `country` not in the parameter type.

- [ ] **Step 3: Update `InstrumentRepository.findOrCreate`**

Replace the entire `findOrCreate` in `src/repositories/instrument-repository.ts`:

```typescript
findOrCreate: (data: {
  symbol: string;
  name: string;
  exchange: string;
  country?: string;
  instrumentClassId: number;
}) =>
  db.instrument.upsert({
    where: { symbol: data.symbol },
    update: {},
    create: data,
  }),
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- --testPathPattern="instrument-repository" --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/repositories/instrument-repository.ts src/repositories/__tests__/instrument-repository.test.ts
git commit -m "feat(instrument): add country to InstrumentRepository.findOrCreate"
```

---

### Task 2: Add `country` to `InstrumentDTO` and service response mappers

**Files:**
- Modify: `src/types/portfolio.ts`
- Modify: `src/services/operation-service.ts`
- Modify: `src/services/portfolio-services.ts`

- [ ] **Step 1: Add `country` to `InstrumentDTO`**

In `src/types/portfolio.ts`, update `InstrumentDTO`:

```typescript
export interface InstrumentDTO {
  symbol: string;
  name: string;
  instrumentClass: string;
  country: string | null;
}
```

- [ ] **Step 2: Update `OperationService.addTransaction`**

In `src/services/operation-service.ts`, make these two changes:

**2a. Add `'American Depositary Receipt'` to the class map and add `country` to params:**

```typescript
const INSTRUMENT_CLASS_MAP: Record<string, string> = {
  'Common Stock': 'Stock',
  'American Depositary Receipt': 'Stock',
  ETF: 'ETF',
  'Digital Currency': 'Crypto',
  Bond: 'Bond',
};
```

**2b. Add `country` to the `addTransaction` params interface:**

```typescript
export const OperationService = {
  addTransaction: async (params: {
    userId: number;
    portfolioId: number;
    side: 'BUY' | 'SELL';
    symbol: string;
    name: string;
    instrumentClass: string;
    country?: string;
    date: string;
    price: number;
    quantity: number;
  }): Promise<HoldingDTO> => {
```

**2c. Pass `country` to `findOrCreate`:**

```typescript
const instrument = await InstrumentRepository.findOrCreate({
  symbol: params.symbol,
  name: params.name,
  exchange: '',
  country: params.country,
  instrumentClassId: instrumentClass.id,
});
```

**2d. Include `country` in the returned `HoldingDTO`:**

```typescript
return {
  id: holdingWithDetails.id,
  instrument: {
    symbol: holdingWithDetails.instrument.symbol,
    name: holdingWithDetails.instrument.name,
    instrumentClass: holdingWithDetails.instrument.instrumentClass.name,
    country: holdingWithDetails.instrument.country ?? null,
  },
  quantity,
  avgCost,
};
```

- [ ] **Step 3: Update `PortfolioService.getPortfolioDetail`**

In `src/services/portfolio-services.ts`, update the instrument mapping inside `getPortfolioDetail`:

```typescript
const holdings: HoldingDTO[] = holdingsWithDetails
  .map((h) => {
    const { quantity, avgCost } = computeHoldingMetrics(h.operations);
    return {
      id: h.id,
      instrument: {
        symbol: h.instrument.symbol,
        name: h.instrument.name,
        instrumentClass: h.instrument.instrumentClass.name,
        country: h.instrument.country ?? null,
      },
      quantity,
      avgCost,
    };
  })
  .filter((h) => h.quantity > 0);
```

- [ ] **Step 4: Run the existing operation service tests to confirm nothing broke**

```bash
npm test -- --testPathPattern="operation-service" --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 5: Add a test verifying `country` is returned from `addTransaction`**

Add this test to `src/services/__tests__/operation-service.test.ts` inside `describe('addTransaction')`:

```typescript
it('returns country in instrument when provided', async () => {
  const user = await createTestUser();
  const portfolio = await PortfolioRepository.create({ name: 'Test', userId: user.id });

  const holding = await OperationService.addTransaction({
    userId: user.id,
    portfolioId: portfolio.id,
    side: 'BUY',
    symbol: `NVO${Date.now()}`,
    name: 'Novo Nordisk A/S',
    instrumentClass: 'American Depositary Receipt',
    country: 'DK',
    date: '2026-04-26',
    price: 90,
    quantity: 10,
  });

  expect(holding.instrument.country).toBe('DK');
  expect(holding.instrument.instrumentClass).toBe('Stock');
});
```

- [ ] **Step 6: Run all service tests**

```bash
npm test -- --testPathPattern="operation-service|portfolio-services" --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types/portfolio.ts src/services/operation-service.ts src/services/portfolio-services.ts src/services/__tests__/operation-service.test.ts
git commit -m "feat(instrument): propagate country through services and DTOs"
```

---

### Task 3: Expose `country` in GraphQL schema and resolver

**Files:**
- Modify: `src/apollo/schema/schema.ts`
- Modify: `src/apollo/resolvers/Mutation.ts`

- [ ] **Step 1: Update the GraphQL schema**

In `src/apollo/schema/schema.ts`, update the `Instrument` type and `addTransaction` mutation:

```typescript
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
  }

  type PortfolioDetail {
    id: Int!
    name: String!
    description: String
    holdings: [Holding!]!
  }

  enum OperationSide {
    BUY
    SELL
  }

  type Query {
    # Returns the portfolios owned by the authenticated user.
    portfolios: [Portfolio!]!
    # Returns detail (holdings) for a single portfolio owned by the authenticated user.
    portfolioDetail(id: Int!): PortfolioDetail
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
      country: String
      date: String!
      price: Float!
      quantity: Float!
    ): Holding!
  }
`;
```

- [ ] **Step 2: Update the `addTransaction` resolver**

In `src/apollo/resolvers/Mutation.ts`, add `country` to the `args` type and pass it to the service:

```typescript
addTransaction: async (
  _: unknown,
  args: {
    portfolioId: number;
    side: 'BUY' | 'SELL';
    symbol: string;
    name: string;
    instrumentClass: string;
    country?: string;
    date: string;
    price: number;
    quantity: number;
  },
  context: ApolloContext,
) => {
  if (!context.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED', httpCode: 401 },
    });
  }

  try {
    return await OperationService.addTransaction({
      userId: context.user.userId,
      ...args,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new GraphQLError(err.message, {
        extensions: { code: err.message, httpCode: err.httpCode },
      });
    }
    throw err;
  }
},
```

- [ ] **Step 3: Run the full test suite to confirm nothing regressed**

```bash
npm test -- --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apollo/schema/schema.ts src/apollo/resolvers/Mutation.ts
git commit -m "feat(graphql): add country to Instrument type and addTransaction mutation"
```
