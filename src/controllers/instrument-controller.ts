import { Controller, Get, Query, Route, Security, Path } from '@tsoa/runtime';
import { InstrumentClient, InstrumentSearchResult } from '../clients/twelve-data-client';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';

interface QuoteResponse {
  symbol: string;
  price: number;
}

@Route('instruments')
export class InstrumentController extends Controller {
  /**
   * Search for instruments by symbol, name, or ISIN via TwelveData.
   * @summary Search instruments
   */
  @Security('jwt')
  @Get('/search')
  public async searchInstruments(@Query() q: string): Promise<InstrumentSearchResult[]> {
    if (!q || q.trim().length === 0) {
      throw new ApiError(errors.VALIDATION_ERROR);
    }

    return InstrumentClient.search(q.trim());
  }

  /**
   * Get the current market price for a symbol via TwelveData.
   * @summary Get instrument quote
   */
  @Security('jwt')
  @Get('/quote/{symbol}')
  public async getQuote(@Path() symbol: string): Promise<QuoteResponse> {
    const price = await InstrumentClient.getQuote(symbol);
    return { symbol, price };
  }
}
