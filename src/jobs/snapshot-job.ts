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
    InstrumentRepository.findOrCreate({
      symbol: 'SPX',
      name: 'S&P 500 Index',
      exchange: 'NYSE',
      country: 'US',
      instrumentClassId: indexClassId,
    }),
    InstrumentRepository.findOrCreate({
      symbol: 'NDX',
      name: 'Nasdaq 100 Index',
      exchange: 'NASDAQ',
      country: 'US',
      instrumentClassId: indexClassId,
    }),
  ]);
  return benchmarks.map((b) => b.id);
};

const getEarliestOperationDateForInstrument = async (
  instrumentId: number,
): Promise<Date | null> => {
  const earliest = await db.operation.findFirst({
    where: { holding: { instrumentId } },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  if (!earliest) {
    return null;
  }
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

  if (closes.length === 0) {
    return;
  }

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
