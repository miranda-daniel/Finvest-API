export interface InstrumentSearchResponse {
  symbol: string;
  name: string;
  type: string; // raw TwelveData instrument_type, e.g. "Common Stock", "ETF"
  exchange: string;
  country: string;
}

export interface QuoteResponse {
  symbol: string;
  price: number;
}

// Map of symbol → current price for all requested symbols that were found.
export type BatchQuotesResponse = Record<string, number>;
