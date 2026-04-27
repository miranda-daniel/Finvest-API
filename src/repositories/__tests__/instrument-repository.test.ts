import { InstrumentRepository } from '@repositories/instrument-repository';

const seedInstrumentClass = async (name = 'Stock') => InstrumentRepository.findOrCreateClass(name);

describe('InstrumentRepository', () => {
  describe('findOrCreateClass', () => {
    it('creates an InstrumentClass when it does not exist', async () => {
      const cls = await InstrumentRepository.findOrCreateClass('Crypto');
      expect(cls.name).toBe('Crypto');
      expect(cls.id).toBeGreaterThan(0);
    });

    it('returns existing InstrumentClass when called twice with same name', async () => {
      const a = await InstrumentRepository.findOrCreateClass('ETF');
      const b = await InstrumentRepository.findOrCreateClass('ETF');
      expect(a.id).toBe(b.id);
    });
  });

  describe('findOrCreate', () => {
    it('creates an Instrument when it does not exist', async () => {
      const cls = await seedInstrumentClass();
      const instrument = await InstrumentRepository.findOrCreate({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        instrumentClassId: cls.id,
      });
      expect(instrument.symbol).toBe('AAPL');
      expect(instrument.name).toBe('Apple Inc.');
    });

    it('returns existing Instrument when called twice with same symbol', async () => {
      const cls = await seedInstrumentClass();
      const a = await InstrumentRepository.findOrCreate({
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        exchange: 'NASDAQ',
        instrumentClassId: cls.id,
      });
      const b = await InstrumentRepository.findOrCreate({
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        exchange: 'NASDAQ',
        instrumentClassId: cls.id,
      });
      expect(a.id).toBe(b.id);
    });

    it('persists country when provided', async () => {
      const cls = await seedInstrumentClass();
      const instrument = await InstrumentRepository.findOrCreate({
        symbol: 'NVO',
        name: 'Novo Nordisk A/S',
        exchange: 'NYSE',
        country: 'DK',
        instrumentClassId: cls.id,
      });
      expect(instrument.country).toBe('DK');
    });

    it('stores null country when not provided', async () => {
      const cls = await seedInstrumentClass();
      const instrument = await InstrumentRepository.findOrCreate({
        symbol: 'NOCOUNTRY',
        name: 'No Country Corp.',
        exchange: 'NYSE',
        instrumentClassId: cls.id,
      });
      expect(instrument.country).toBeNull();
    });
  });

  describe('findBySymbol', () => {
    it('returns null when symbol does not exist', async () => {
      const result = await InstrumentRepository.findBySymbol('DOES_NOT_EXIST');
      expect(result).toBeNull();
    });

    it('returns the instrument when symbol exists', async () => {
      const cls = await seedInstrumentClass();
      await InstrumentRepository.findOrCreate({
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        exchange: 'NASDAQ',
        instrumentClassId: cls.id,
      });
      const result = await InstrumentRepository.findBySymbol('TSLA');
      expect(result?.symbol).toBe('TSLA');
    });
  });
});
