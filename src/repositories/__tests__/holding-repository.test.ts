import { HoldingRepository } from '@repositories/holding-repository';
import { InstrumentRepository } from '@repositories/instrument-repository';
import { UserRepository } from '@repositories/user-repository';
import { db } from '@config/db';
import { hashPassword } from '@helpers/password';

const createTestUser = async () => {
  const email = `holding.repo.${Date.now()}@test.com`;
  return UserRepository.create({
    email,
    password: await hashPassword('password123'),
    firstName: 'Test',
    lastName: 'User',
  });
};

const createTestPortfolio = async (userId: number) =>
  db.portfolio.create({ data: { name: 'Test Portfolio', userId } });

const createTestInstrument = async (symbol: string) => {
  const cls = await db.instrumentClass.upsert({
    where: { name: 'Stock' },
    update: {},
    create: { name: 'Stock' },
  });
  return InstrumentRepository.findOrCreate({
    symbol,
    name: `${symbol} Corp.`,
    exchange: 'NASDAQ',
    instrumentClassId: cls.id,
  });
};

describe('HoldingRepository', () => {
  describe('findOrCreate', () => {
    it('creates a holding when one does not exist', async () => {
      const user = await createTestUser();
      const portfolio = await createTestPortfolio(user.id);
      const instrument = await createTestInstrument(`HOLD${Date.now()}`);

      const holding = await HoldingRepository.findOrCreate({
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
      });

      expect(holding.portfolioId).toBe(portfolio.id);
      expect(holding.instrumentId).toBe(instrument.id);
    });

    it('returns existing holding when called twice', async () => {
      const user = await createTestUser();
      const portfolio = await createTestPortfolio(user.id);
      const instrument = await createTestInstrument(`HOLD2${Date.now()}`);

      const a = await HoldingRepository.findOrCreate({
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
      });
      const b = await HoldingRepository.findOrCreate({
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
      });

      expect(a.id).toBe(b.id);
    });
  });

  describe('findByPortfolioWithDetails', () => {
    it('returns holdings with instrument and operations included', async () => {
      const user = await createTestUser();
      const portfolio = await createTestPortfolio(user.id);
      const instrument = await createTestInstrument(`HOLD3${Date.now()}`);
      const holding = await HoldingRepository.findOrCreate({
        portfolioId: portfolio.id,
        instrumentId: instrument.id,
      });

      await db.operation.create({
        data: {
          holdingId: holding.id,
          type: 'BUY',
          quantity: 10,
          price: 150,
          fees: 0,
          date: new Date(),
        },
      });

      const holdings = await HoldingRepository.findByPortfolioWithDetails(portfolio.id);
      expect(holdings).toHaveLength(1);
      expect(holdings[0].instrument.symbol).toBe(instrument.symbol);
      expect(holdings[0].operations).toHaveLength(1);
    });
  });
});
