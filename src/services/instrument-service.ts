import { InstrumentClient } from '@clients/twelve-data-client';
import { InstrumentSearchResponse } from '@typing/instrument';
import { redis } from '@cache/redis';

const today = (): string => new Date().toISOString().slice(0, 10);

const QUOTES_TTL_SECONDS = 60;

export const InstrumentService = {
  search: (query: string): Promise<InstrumentSearchResponse[]> => InstrumentClient.search(query),

  getQuote: (symbol: string): Promise<number> => InstrumentClient.getQuote(symbol),

  getBatchQuotes: async (symbols: string[]): Promise<Record<string, number>> => {
    const key = `quotes:${[...symbols].sort().join(',')}`;
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as Record<string, number>;
    }

    const result = await InstrumentClient.getBatchQuotes(symbols);
    await redis.setex(key, QUOTES_TTL_SECONDS, JSON.stringify(result));
    return result;
  },

  getBatchEodPrices: async (symbols: string[]): Promise<Record<string, number>> => {
    // EOD prices don't change within a day — key includes date as natural invalidation
    const key = `eod:${[...symbols].sort().join(',')}:${today()}`;
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as Record<string, number>;
    }

    const result = await InstrumentClient.getBatchEodPrices(symbols);
    // Keep until midnight + 1h buffer so next-day requests always get fresh data
    const secondsUntilMidnight = 86400 - ((Date.now() / 1000) % 86400);
    await redis.setex(key, Math.floor(secondsUntilMidnight) + 3600, JSON.stringify(result));
    return result;
  },
};
