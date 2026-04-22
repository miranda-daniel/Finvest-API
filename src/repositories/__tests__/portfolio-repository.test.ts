import { PortfolioRepository } from '@repositories/portfolio-repository';
import { UserRepository } from '@repositories/user-repository';

describe('PortfolioRepository', () => {
  describe('findManyByUserId', () => {
    it('returns an empty array when the user has no portfolios', async () => {
      const user = await UserRepository.create({
        firstName: 'Empty',
        lastName: 'Portfolio',
        email: `empty.portfolio.${Date.now()}@test.com`,
        password: 'hash',
      });

      const portfolios = await PortfolioRepository.findManyByUserId(user.id);

      expect(Array.isArray(portfolios)).toBe(true);
      expect(portfolios).toHaveLength(0);
    });

    it('returns portfolios belonging to the user', async () => {
      const user = await UserRepository.create({
        firstName: 'Has',
        lastName: 'Portfolio',
        email: `has.portfolio.${Date.now()}@test.com`,
        password: 'hash',
      });

      await PortfolioRepository.create({ name: 'Long Term', userId: user.id });
      await PortfolioRepository.create({ name: 'Trading', userId: user.id });

      const portfolios = await PortfolioRepository.findManyByUserId(user.id);

      expect(portfolios).toHaveLength(2);
      expect(portfolios.map((p) => p.name)).toContain('Long Term');
      expect(portfolios.map((p) => p.name)).toContain('Trading');
    });

    it('does not return portfolios from other users', async () => {
      const userA = await UserRepository.create({
        firstName: 'User',
        lastName: 'A',
        email: `user.a.${Date.now()}@test.com`,
        password: 'hash',
      });

      const userB = await UserRepository.create({
        firstName: 'User',
        lastName: 'B',
        email: `user.b.${Date.now()}@test.com`,
        password: 'hash',
      });

      await PortfolioRepository.create({
        name: 'UserA Portfolio',
        userId: userA.id,
      });

      const portfolios = await PortfolioRepository.findManyByUserId(userB.id);

      expect(portfolios).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('returns a portfolio by id', async () => {
      const user = await UserRepository.create({
        firstName: 'Find',
        lastName: 'ById',
        email: `find.byid.${Date.now()}@test.com`,
        password: 'hash',
      });
      const created = await PortfolioRepository.create({ name: 'Find Me', userId: user.id });

      const result = await PortfolioRepository.findById(created.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe('Find Me');
    });

    it('returns null when portfolio does not exist', async () => {
      const result = await PortfolioRepository.findById(999999);
      expect(result).toBeNull();
    });
  });
});
