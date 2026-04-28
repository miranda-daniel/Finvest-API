export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  type: string; // raw TwelveData instrument_type, e.g. "Common Stock", "ETF"
  exchange: string;
  country: string;
}
