import { PortfolioService } from '@services/portfolio-services';
import { UserService } from '@services/user-services';
import { PortfolioRepository } from '@repositories/portfolio-repository';
import { UserRepository } from '@repositories/user-repository';

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
      expect(typeof result[0].createdAt).toBe('string');
      expect(result[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns isFavorite: true for the user favorite portfolio', async () => {
      const user = await UserService.registerUserService({
        firstName: 'Fav',
        lastName: 'Portfolio',
        email: `fav.portfolio.${Date.now()}@test.com`,
        password: 'password123',
      });
      const portfolio = await PortfolioRepository.create({ name: 'Favorite One', userId: user.id });
      await UserRepository.setFavoritePortfolio(user.id, portfolio.id);

      const result = await PortfolioService.getPortfoliosByUserId(user.id);

      const fav = result.find((p) => p.id === portfolio.id);
      expect(fav?.isFavorite).toBe(true);
    });

    it('returns isFavorite: false for non-favorite portfolios', async () => {
      const user = await UserService.registerUserService({
        firstName: 'NonFav',
        lastName: 'Portfolio',
        email: `nonfav.portfolio.${Date.now()}@test.com`,
        password: 'password123',
      });
      await PortfolioRepository.create({ name: 'Not Favorite', userId: user.id });

      const result = await PortfolioService.getPortfoliosByUserId(user.id);

      expect(result[0].isFavorite).toBe(false);
    });
  });
});
