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
      return (
        opDay <= snapshotDate && (op.type === OperationType.BUY || op.type === OperationType.SELL)
      );
    })
    .reduce((sum, op) => {
      return op.type === OperationType.BUY
        ? sum + op.quantity.toNumber()
        : sum - op.quantity.toNumber();
    }, 0);
};

const normalizeReturnPct = (current: number, base: number): number => {
  if (base === 0) {
    return 0;
  }
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
    if (holdingsWithDetails.length === 0) {
      return [];
    }

    // Find earliest operation date across all holdings for ALL range resolution
    const allOperationDates = holdingsWithDetails.flatMap((h) => h.operations.map((op) => op.date));
    const earliestOperationDate =
      allOperationDates.length > 0
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

    if (snapshots.length === 0) {
      return [];
    }

    // Group snapshots by date string then by instrumentId for fast lookup
    const snapshotsByDate = new Map<string, Map<number, number>>();
    for (const snap of snapshots) {
      const dateKey = snap.date.toISOString().slice(0, 10);
      if (!snapshotsByDate.has(dateKey)) {
        snapshotsByDate.set(dateKey, new Map());
      }
      snapshotsByDate.get(dateKey)!.set(snap.instrumentId, Number(snap.closePrice));
    }

    // Compute portfolio value per day
    const points: Array<{
      date: string;
      portfolioValue: number;
      spxClose: number;
      ndxClose: number;
    }> = [];

    for (const [dateKey, priceMap] of snapshotsByDate) {
      const snapshotDate = new Date(`${dateKey}T00:00:00Z`);

      let portfolioValue = 0;
      for (const holding of holdingsWithDetails) {
        const price = priceMap.get(holding.instrumentId);
        if (price === null || price === undefined) {
          continue;
        }
        const qty = computeQuantityAtDate(holding.operations, snapshotDate);
        if (qty > 0) {
          portfolioValue += qty * price;
        }
      }

      const spxClose = spxInstrument ? (priceMap.get(spxInstrument.id) ?? 0) : 0;
      const ndxClose = ndxInstrument ? (priceMap.get(ndxInstrument.id) ?? 0) : 0;

      points.push({ date: dateKey, portfolioValue, spxClose, ndxClose });
    }

    points.sort((a, b) => a.date.localeCompare(b.date));

    if (points.length === 0) {
      return [];
    }

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
