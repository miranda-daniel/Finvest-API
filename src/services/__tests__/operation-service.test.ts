import { OperationService } from '@services/operation-service';
import { UserRepository } from '@repositories/user-repository';
import { PortfolioRepository } from '@repositories/portfolio-repository';
import { hashPassword } from '@helpers/password';

const createTestUser = async () => {
  const email = `op.service.${Date.now()}@test.com`;
  return UserRepository.create({
    email,
    password: await hashPassword('password123'),
    firstName: 'Op',
    lastName: 'Service',
  });
};

describe('OperationService', () => {
  describe('addTransaction', () => {
    it('creates instrument, holding, and operation on first BUY', async () => {
      const user = await createTestUser();
      const portfolio = await PortfolioRepository.create({ name: 'Test', userId: user.id });

      const holding = await OperationService.addTransaction({
        userId: user.id,
        portfolioId: portfolio.id,
        side: 'BUY',
        symbol: `SVCTEST${Date.now()}`,
        name: 'Service Test Corp.',
        instrumentClass: 'Stock',
        date: '2026-04-25',
        price: 100,
        quantity: 5,
      });

      expect(holding.quantity).toBe(5);
      expect(holding.avgCost).toBeCloseTo(100);
      expect(holding.instrument.symbol).toMatch(/^SVCTEST/);
    });

    it('accumulates quantity on second BUY for same symbol', async () => {
      const user = await createTestUser();
      const portfolio = await PortfolioRepository.create({ name: 'Test', userId: user.id });
      const symbol = `ACCUM${Date.now()}`;

      await OperationService.addTransaction({
        userId: user.id,
        portfolioId: portfolio.id,
        side: 'BUY',
        symbol,
        name: 'Accum Corp.',
        instrumentClass: 'Stock',
        date: '2026-04-20',
        price: 100,
        quantity: 5,
      });

      const holding = await OperationService.addTransaction({
        userId: user.id,
        portfolioId: portfolio.id,
        side: 'BUY',
        symbol,
        name: 'Accum Corp.',
        instrumentClass: 'Stock',
        date: '2026-04-25',
        price: 200,
        quantity: 5,
      });

      expect(holding.quantity).toBe(10);
      expect(holding.avgCost).toBeCloseTo(150);
    });

    it('throws NOT_FOUND when portfolio does not belong to user', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const portfolio = await PortfolioRepository.create({ name: 'Other', userId: otherUser.id });

      await expect(
        OperationService.addTransaction({
          userId: user.id,
          portfolioId: portfolio.id,
          side: 'BUY',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          instrumentClass: 'Stock',
          date: '2026-04-25',
          price: 100,
          quantity: 1,
        }),
      ).rejects.toThrow();
    });

    it('returns country in instrument when provided', async () => {
      const user = await createTestUser();
      const portfolio = await PortfolioRepository.create({ name: 'Test', userId: user.id });

      const holding = await OperationService.addTransaction({
        userId: user.id,
        portfolioId: portfolio.id,
        side: 'BUY',
        symbol: `NVO${Date.now()}`,
        name: 'Novo Nordisk A/S',
        instrumentClass: 'American Depositary Receipt',
        country: 'DK',
        date: '2026-04-26',
        price: 90,
        quantity: 10,
      });

      expect(holding.instrument.country).toBe('DK');
      expect(holding.instrument.instrumentClass).toBe('Stock');
    });
  });
});
