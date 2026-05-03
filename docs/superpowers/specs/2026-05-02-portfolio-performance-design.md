# Portfolio Performance — Implementation Design

## Spec 1: Daily Snapshot Job (API)

### Goal
Populate `PriceSnapshot` daily for all instruments ever held in any portfolio, plus SPX and NDX as benchmark indices, so the frontend can render historical portfolio value and performance charts.

### Architecture

```
src/index.ts
  └── registers snapshot job at startup (backfill check + cron at 23:00 UTC)

src/jobs/snapshot-job.ts
  └── runSnapshotJob()
        ├── fetchInstrumentsToSnapshot()   ← all instruments with holdings + SPX + NDX
        ├── detectMissingDates()           ← per instrument, find gaps since first operation
        ├── InstrumentClient.getHistoricalClosePrices()  ← /time_series backfill
        └── PriceSnapshotRepository.upsertMany()

src/repositories/price-snapshot-repository.ts
  └── findLatestDateByInstrument()
  └── upsertMany()

src/clients/twelve-data-client.ts
  └── getHistoricalClosePrices(symbol, startDate, endDate)
        → GET /time_series?symbol=ACN&interval=1day&start_date=...&end_date=...
        → returns Array<{ date: string; close: number }>
```

### SPX and NDX bootstrapping

SPX and NDX are seeded as `Instrument` rows with `InstrumentClass.name = "Index"` at job startup if they don't exist yet. They are never associated to any holding — the job includes them unconditionally as benchmarks.

```
SPX: { symbol: "SPX", name: "S&P 500 Index", exchange: "NYSE", country: "US" }
NDX: { symbol: "NDX", name: "Nasdaq 100 Index", exchange: "NASDAQ", country: "US" }
```

### Backfill logic

On server startup and on each cron tick:

1. Load all distinct instrument IDs from `Holding` (across all portfolios) + SPX + NDX IDs
2. For each instrument:
   - Find `latestSnapshotDate` from `PriceSnapshot`
   - If no snapshot exists: start from the earliest `Operation.date` across all holdings of that instrument (or 1 year ago for SPX/NDX if no operations)
   - If `latestSnapshotDate < yesterday`: call `getHistoricalClosePrices(symbol, latestSnapshotDate + 1day, yesterday)`
   - Upsert all returned rows into `PriceSnapshot`
3. Symbols are processed sequentially with a 200ms delay between calls to respect TwelveData rate limits

### Cron schedule

- Runs daily at **23:00 UTC** (20:00 Argentina time)
- Also runs once at server startup (covers gaps from downtime)
- Uses `node-cron` package

### Error handling

- Per-symbol errors are caught and logged — one failing symbol does not abort the job
- Job errors do not crash the server process

---

## Spec 2: Portfolio Performance Query (API)

### Goal
Expose a GraphQL query that returns daily portfolio value and normalized % return vs SPX and NDX for a given time range.

### GraphQL additions

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

type Query {
  # existing queries...
  portfolioPerformance(portfolioId: Int!, range: PortfolioRange!): [PortfolioPerformancePoint!]!
}
```

### Calculation logic (`portfolio-performance-service.ts`)

Given `portfolioId` and `range`:

1. Resolve date range: `startDate` based on range enum, `endDate` = today
   - `ONE_MONTH`: today - 30 days
   - `THREE_MONTHS`: today - 90 days
   - `YEAR_TO_DATE`: Jan 1 of current year
   - `ONE_YEAR`: today - 365 days
   - `ALL`: date of earliest operation in portfolio

2. Load all holdings of the portfolio (including closed ones) with their operations

3. Load `PriceSnapshot` rows for all those instruments + SPX + NDX within the date range

4. For each day in the range that has snapshot data:
   - Compute quantity of each instrument at that date: count BUY operations with `date <= day`, subtract SELL operations with `date <= day`
   - `portfolioValue = sum(quantity × closePrice)` for all instruments with quantity > 0

5. Normalize to % return from first available day:
   - `portfolioReturnPct = (portfolioValue / portfolioValue[firstDay] - 1) * 100`
   - `spxReturnPct = (spxClose / spxClose[firstDay] - 1) * 100`
   - `ndxReturnPct = (ndxClose / ndxClose[firstDay] - 1) * 100`

6. Return array of `PortfolioPerformancePoint` sorted by date ascending

### New files
- `src/services/portfolio-performance-service.ts`
- `src/repositories/price-snapshot-repository.ts` (shared with Spec 1)
- Schema and resolver updates in existing files

---

## Spec 3: Portfolio Performance UI (WEB)

### Goal
Add tabs to `PortfolioDetailPage` and implement the Overview tab with a Value chart and a Performance chart.

### Tab structure

Four tabs between `PortfolioStatsBar` and the holdings table:

```
Overview | Holdings | Transactions | Analysis
```

- **Overview**: portfolio performance chart (this spec)
- **Holdings**: current holdings table (existing `renderHoldingsTable()` — moved here)
- **Transactions**: "Coming soon" placeholder
- **Analysis**: "Coming soon" placeholder

Default active tab: Overview.

Use shadcn `Tabs` component (`src/components/ui/tabs.tsx`, add via `npx shadcn@latest add tabs` if not present).

### PortfolioPerformanceChart component

Two sub-tabs: **Value** and **Performance**.
Period selector below sub-tabs: `1M | 3M | YTD | 1Y | ALL`.

**Value sub-tab** — Recharts `AreaChart`:
- X axis: dates (formatted as `MMM d` for short ranges, `MMM 'YY` for long)
- Y axis: dollar value (formatted as `$120k`, `$1.2M`)
- Single area: portfolio value
- Tooltip shows date + `$X,XXX.XX`
- Gradient fill from `rgba(99,102,241,0.3)` to transparent

**Performance sub-tab** — Recharts `LineChart`:
- Same X axis
- Y axis: percentage (formatted as `+3.2%`)
- Three lines: Portfolio (indigo), SPX (emerald), NDX (amber)
- Legend below chart
- Tooltip shows all three values for hovered date

**Empty state**: if the returned array is empty (no snapshots yet), show:
> "No historical data yet. The first snapshot will be captured tonight."

**Skeleton**: three shimmer bars of varying heights while loading.

### Data hook

```ts
// src/api/hooks/portfolios/usePortfolioPerformance.ts
usePortfolioPerformance(portfolioId: number, range: PortfolioRange)
→ { data: PortfolioPerformancePoint[], loading: boolean, error: string | null }
```

Uses Apollo `useQuery` with `GetPortfolioPerformanceDocument`.

### New files
- `src/components/PortfolioDetailPage/PortfolioTabs.tsx`
- `src/components/PortfolioDetailPage/PortfolioPerformanceChart.tsx`
- `src/api/hooks/portfolios/usePortfolioPerformance.ts`
- `src/api/operations/portfolios/portfolioPerformance.query.graphql`
- Updated: `PortfolioDetailPage.tsx` — add tabs, move holdings table into Holdings tab
