import { PortfolioRepository } from '@repositories/portfolio-repository';
import { InstrumentRepository } from '@repositories/instrument-repository';
import { HoldingRepository } from '@repositories/holding-repository';
import { OperationRepository } from '@repositories/operation-repository';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { computeHoldingMetrics } from '@helpers/holdings';
import { HoldingDTO } from '@typing/portfolio';

const INSTRUMENT_CLASS_MAP: Record<string, string> = {
  'Common Stock': 'Stock',
  'American Depositary Receipt': 'Stock',
  ETF: 'ETF',
  'Digital Currency': 'Crypto',
  Bond: 'Bond',
};

const resolveInstrumentClass = (rawType: string): string =>
  INSTRUMENT_CLASS_MAP[rawType] ?? rawType;

export const OperationService = {
  addTransaction: async (params: {
    userId: number;
    portfolioId: number;
    side: 'BUY' | 'SELL';
    symbol: string;
    name: string;
    instrumentClass: string;
    country?: string;
    date: string;
    price: number;
    quantity: number;
  }): Promise<HoldingDTO> => {
    const portfolio = await PortfolioRepository.findById(params.portfolioId);

    if (!portfolio || portfolio.userId !== params.userId) {
      throw new ApiError(errors.NOT_FOUND);
    }

    const className = resolveInstrumentClass(params.instrumentClass);
    const instrumentClass = await InstrumentRepository.findOrCreateClass(className);

    const instrument = await InstrumentRepository.findOrCreate({
      symbol: params.symbol,
      name: params.name,
      exchange: '',
      country: params.country,
      instrumentClassId: instrumentClass.id,
    });

    const holding = await HoldingRepository.findOrCreate({
      portfolioId: params.portfolioId,
      instrumentId: instrument.id,
    });

    await OperationRepository.create({
      holdingId: holding.id,
      type: params.side,
      quantity: params.quantity,
      price: params.price,
      date: new Date(params.date),
    });

    const holdingWithDetails = await HoldingRepository.findByPortfolioWithDetails(
      params.portfolioId,
    ).then((holdings) => holdings.find((h) => h.id === holding.id));

    if (!holdingWithDetails) {
      throw new ApiError(errors.NOT_FOUND);
    }

    const { quantity, avgCost } = computeHoldingMetrics(holdingWithDetails.operations);

    return {
      id: holdingWithDetails.id,
      instrument: {
        symbol: holdingWithDetails.instrument.symbol,
        name: holdingWithDetails.instrument.name,
        instrumentClass: holdingWithDetails.instrument.instrumentClass.name,
        country: holdingWithDetails.instrument.country ?? null,
      },
      quantity,
      avgCost,
    };
  },
};
