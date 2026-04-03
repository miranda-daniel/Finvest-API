import { PortfolioService } from '@services/portfolio-services';
import { UserService } from '@services/user-services';
import { PortfolioRepository } from '@repositories/portfolio-repository';

describe('PortfolioService', () => {
  describe('getPortfoliosByUserId', () => {
    it('returns an empty array when the user has no portfolios', async () => {
      const user = await UserService.registerUserService({
        firstName: 'No',
        lastName: 'Portfolios',
        email: `no.portfolios.${Date.now()}@test.com`,
        password: 'password123',
      });

      const result = await PortfolioService.getPortfoliosByUserId(user.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('returns portfolios for the user with id, name, and createdAt', async () => {
      const user = await UserService.registerUserService({
        firstName: 'With',
        lastName: 'Portfolios',
        email: `with.portfolios.${Date.now()}@test.com`,
        password: 'password123',
      });

      await PortfolioRepository.create({ name: 'Growth', userId: user.id });

      const result = await PortfolioService.getPortfoliosByUserId(user.id);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Growth');
      expect(result[0].id).toBeDefined();
      expect(result[0].createdAt).toBeDefined();
    });
  });
});
