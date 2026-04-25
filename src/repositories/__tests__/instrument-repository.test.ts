import { InstrumentRepository } from '@repositories/instrument-repository';
import { db } from '@config/db';

const seedInstrumentClass = async (name = 'Stock') =>
  db.instrumentClass.upsert({ where: { name }, update: {}, create: { name } });

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
