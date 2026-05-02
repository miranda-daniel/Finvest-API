// TwelveData (twelvedata.com) — market data provider. Used for instrument search
// (symbol_search endpoint) and real-time price quotes (price endpoint).
import { ENV_VARIABLES } from '@config/config';
import { InstrumentSearchResponse } from '@typing/instrument';

export type { InstrumentSearchResponse };

const COUNTRY_TO_ISO2: Record<string, string> = {
  'United States': 'US',
  Canada: 'CA',
  'United Kingdom': 'GB',
  Germany: 'DE',
  France: 'FR',
  Japan: 'JP',
  Australia: 'AU',
  China: 'CN',
  'Hong Kong': 'HK',
  Switzerland: 'CH',
  Netherlands: 'NL',
  Sweden: 'SE',
  Denmark: 'DK',
  Norway: 'NO',
  Finland: 'FI',
  Spain: 'ES',
  Italy: 'IT',
  Portugal: 'PT',
  Belgium: 'BE',
  Austria: 'AT',
  Poland: 'PL',
  Mexico: 'MX',
  Brazil: 'BR',
  India: 'IN',
  'South Korea': 'KR',
  Singapore: 'SG',
  'New Zealand': 'NZ',
  Ireland: 'IE',
  Israel: 'IL',
  'South Africa': 'ZA',
  Russia: 'RU',
  Taiwan: 'TW',
  Argentina: 'AR',
  Chile: 'CL',
  Colombia: 'CO',
  Indonesia: 'ID',
  Malaysia: 'MY',
  Thailand: 'TH',
  Philippines: 'PH',
};

const toIso2 = (country: string): string => {
  if (country.length === 2) {
    return country.toUpperCase();
  }
  return COUNTRY_TO_ISO2[country] ?? '';
};

export const InstrumentClient = {
  search: async (query: string): Promise<InstrumentSearchResponse[]> => {
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
        country: string;
      }>;
    };

    return (json.data ?? []).map((item) => ({
      symbol: item.symbol,
      name: item.instrument_name,
      type: item.instrument_type,
      exchange: item.exchange,
      country: toIso2(item.country ?? ''),
    }));
  },

  getQuote: async (symbol: string): Promise<number> => {
    const url = new URL('https://api.twelvedata.com/price');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('apikey', ENV_VARIABLES.twelveDataApiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`TwelveData price failed: ${res.status}`);
    }

    const json = (await res.json()) as { price?: string };

    const price = parseFloat(json.price ?? '');

    if (isNaN(price)) {
      throw new Error(`TwelveData returned invalid price for ${symbol}: ${JSON.stringify(json)}`);
    }

    return price;
  },

  // Returns a map of symbol → price. Symbols not found in the response are omitted.
  // TwelveData returns { price: "123" } for a single symbol and { AAPL: { price: "..." }, ... }
  // for multiple symbols — both cases are handled here.
  getBatchQuotes: async (symbols: string[]): Promise<Record<string, number>> => {
    if (symbols.length === 0) {
      return {};
    }

    const url = new URL('https://api.twelvedata.com/price');
    url.searchParams.set('symbol', symbols.join(','));
    url.searchParams.set('apikey', ENV_VARIABLES.twelveDataApiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`TwelveData batch price failed: ${res.status}`);
    }

    const json = (await res.json()) as unknown;

    // TwelveData returns errors as HTTP 200 with { status: "error", ... } in the body
    if ((json as { status?: string }).status === 'error') {
      throw new Error(
        `TwelveData batch quotes error: ${(json as { message?: string }).message ?? 'unknown'}`,
      );
    }

    if (symbols.length === 1) {
      const price = parseFloat((json as { price?: string }).price ?? '');
      return isNaN(price) ? {} : { [symbols[0]]: price };
    }

    const result: Record<string, number> = {};
    const map = json as Record<string, { price?: string }>;
    for (const symbol of symbols) {
      const price = parseFloat(map[symbol]?.price ?? '');
      if (!isNaN(price)) {
        result[symbol] = price;
      }
    }
    return result;
  },

  // Returns a map of symbol → previous close price. Same single/multi response shape as getBatchQuotes.
  getBatchEodPrices: async (symbols: string[]): Promise<Record<string, number>> => {
    if (symbols.length === 0) {
      return {};
    }

    const url = new URL('https://api.twelvedata.com/eod');
    url.searchParams.set('symbol', symbols.join(','));
    url.searchParams.set('apikey', ENV_VARIABLES.twelveDataApiKey);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`TwelveData batch eod failed: ${res.status}`);
    }

    const json = (await res.json()) as unknown;

    // TwelveData returns errors as HTTP 200 with { status: "error", ... } in the body
    if ((json as { status?: string }).status === 'error') {
      throw new Error(
        `TwelveData batch eod error: ${(json as { message?: string }).message ?? 'unknown'}`,
      );
    }

    if (symbols.length === 1) {
      const close = parseFloat((json as { close?: string }).close ?? '');
      return isNaN(close) ? {} : { [symbols[0]]: close };
    }

    const result: Record<string, number> = {};
    const map = json as Record<string, { close?: string }>;
    for (const symbol of symbols) {
      const close = parseFloat(map[symbol]?.close ?? '');
      if (!isNaN(close)) {
        result[symbol] = close;
      }
    }
    return result;
  },
};
