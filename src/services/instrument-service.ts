import { InstrumentClient, InstrumentSearchResult } from '@clients/twelve-data-client';

export const InstrumentService = {
  search: (query: string): Promise<InstrumentSearchResult[]> => InstrumentClient.search(query),

  getQuote: (symbol: string): Promise<number> => InstrumentClient.getQuote(symbol),
};
