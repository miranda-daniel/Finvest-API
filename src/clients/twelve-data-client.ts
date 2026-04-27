// TwelveData (twelvedata.com) — market data provider. Used for instrument search
// (symbol_search endpoint) and real-time price quotes (price endpoint).
import { ENV_VARIABLES } from '@config/config';

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

export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  type: string; // raw TwelveData instrument_type, e.g. "Common Stock", "ETF"
  exchange: string;
  country: string;
}

export const TwelveDataClient = {
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
};
