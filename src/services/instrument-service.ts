import { InstrumentClient } from '@clients/twelve-data-client';
import { InstrumentSearchResponse } from '@typing/instrument';

export const InstrumentService = {
  search: (query: string): Promise<InstrumentSearchResponse[]> => InstrumentClient.search(query),

  getQuote: (symbol: string): Promise<number> => InstrumentClient.getQuote(symbol),

  getBatchQuotes: (symbols: string[]): Promise<Record<string, number>> =>
    InstrumentClient.getBatchQuotes(symbols),

  getBatchEodPrices: (symbols: string[]): Promise<Record<string, number>> =>
    InstrumentClient.getBatchEodPrices(symbols),
};
