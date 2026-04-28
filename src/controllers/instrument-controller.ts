import { Controller, Get, Query, Route, Security, Path } from '@tsoa/runtime';
import { InstrumentSearchResponse, QuoteResponse } from '@typing/instrument';
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
}
