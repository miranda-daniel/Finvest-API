import { Controller, Get, Query, Route, Security, Path } from '@tsoa/runtime';
import { InstrumentSearchResponse, QuoteResponse, BatchQuotesResponse } from '@typing/instrument';
import { InstrumentService } from '@services/instrument-service';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';

@Route('instruments')
export class InstrumentController extends Controller {
  /**
   * Search for instruments by symbol, name, or ISIN via TwelveData.
   * @summary Search instruments
   */
  @Security('jwt')
  @Get('/search')
  public async searchInstruments(@Query() q: string): Promise<InstrumentSearchResponse[]> {
    if (!q || q.trim().length === 0) {
      throw new ApiError(errors.VALIDATION_ERROR);
    }

    return InstrumentService.search(q.trim());
  }

  /**
   * Get the current market price for a symbol via TwelveData.
   * @summary Get instrument quote
   */
  @Security('jwt')
  @Get('/quote/{symbol}')
  public async getQuote(@Path() symbol: string): Promise<QuoteResponse> {
    const price = await InstrumentService.getQuote(symbol);
    return { symbol, price };
  }

  /**
   * Get current market prices for multiple symbols in a single request via TwelveData.
   * Returns a map of symbol → price. Symbols not found are omitted from the response.
   * @summary Get batch quotes
   */
  @Security('jwt')
  @Get('/quotes')
  public async getBatchQuotes(@Query() symbols: string): Promise<BatchQuotesResponse> {
    const list = symbols
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (list.length === 0) {
      throw new ApiError(errors.VALIDATION_ERROR);
    }

    return InstrumentService.getBatchQuotes(list);
  }
}
