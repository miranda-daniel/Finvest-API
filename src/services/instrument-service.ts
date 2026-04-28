import { InstrumentClient } from '@clients/twelve-data-client';
import { InstrumentSearchResult } from '@typing/instrument';

export const InstrumentService = {
  search: (query: string): Promise<InstrumentSearchResult[]> => InstrumentClient.search(query),

  getQuote: (symbol: string): Promise<number> => InstrumentClient.getQuote(symbol),
};
