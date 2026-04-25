// src/clients/instrument-client.ts
import { ENV_VARIABLES } from '@config/config';

export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  type: string; // raw TwelveData instrument_type, e.g. "Common Stock", "ETF"
  exchange: string;
}

export const InstrumentClient = {
  search: async (query: string): Promise<InstrumentSearchResult[]> => {
    const url = new URL('https://api.twelvedata.com/symbol_search');
    url.searchParams.set('symbol', query);
    url.searchParams.set('outputsize', '10');
    url.searchParams.set('apikey', ENV_VARIABLES.twelveDataApiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`TwelveData symbol_search failed: ${res.status}`);
    }

    const json = (await res.json()) as {
      data?: Array<{
        symbol: string;
        instrument_name: string;
        instrument_type: string;
        exchange: string;
      }>;
    };

    return (json.data ?? []).map((item) => ({
      symbol: item.symbol,
      name: item.instrument_name,
      type: item.instrument_type,
      exchange: item.exchange,
    }));
  },

  getQuote: async (symbol: string): Promise<number> => {
    const url = new URL('https://api.twelvedata.com/quote');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('apikey', ENV_VARIABLES.twelveDataApiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`TwelveData quote failed: ${res.status}`);
    }

    const json = (await res.json()) as { close?: string };

    const price = parseFloat(json.close ?? '');

    if (isNaN(price)) {
      throw new Error(`TwelveData returned invalid price for ${symbol}`);
    }

    return price;
  },
};
