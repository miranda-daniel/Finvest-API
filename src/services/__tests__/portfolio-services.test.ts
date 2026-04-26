import { PortfolioService } from '@services/portfolio-services';
import { OperationService } from '@services/operation-service';
import { UserService } from '@services/user-services';
import { PortfolioRepository } from '@repositories/portfolio-repository';
import { UserRepository } from '@repositories/user-repository';
import { hashPassword } from '@helpers/password';

const createTestUser = async () => {
  const email = `portfolio.svc.${Date.now()}@test.com`;
  return UserRepository.create({
    email,
    password: await hashPassword('password123'),
    firstName: 'Port',
    lastName: 'Service',
  });
};

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

  describe('setFavoritePortfolio', () => {
    it('sets a portfolio as favorite and returns it with isFavorite: true', async () => {
      const user = await UserService.registerUserService({
        firstName: 'Set',
        lastName: 'Fav',
        email: `set.fav.${Date.now()}@test.com`,
        password: 'password123',
      });
      const portfolio = await PortfolioRepository.create({ name: 'Star Me', userId: user.id });

      const result = await PortfolioService.setFavoritePortfolio(user.id, portfolio.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(portfolio.id);
      expect(result?.isFavorite).toBe(true);
    });

    it('returns null and clears the favorite when portfolioId is null', async () => {
      const user = await UserService.registerUserService({
        firstName: 'Clear',
        lastName: 'Fav',
        email: `clear.fav.${Date.now()}@test.com`,
        password: 'password123',
      });
      const portfolio = await PortfolioRepository.create({ name: 'Unstar Me', userId: user.id });
      await UserRepository.setFavoritePortfolio(user.id, portfolio.id);

      const result = await PortfolioService.setFavoritePortfolio(user.id, null);

      expect(result).toBeNull();
      const updatedUser = await UserRepository.findById(user.id);
      expect(updatedUser?.favoritePortfolioId).toBeNull();
    });
  });

  describe('getPortfolioDetail', () => {
    it('returns portfolio with computed holdings', async () => {
      const user = await createTestUser();
      const portfolio = await PortfolioRepository.create({ name: 'Detail Test', userId: user.id });

      await OperationService.addTransaction({
        userId: user.id,
        portfolioId: portfolio.id,
        side: 'BUY',
        symbol: `DETTEST${Date.now()}`,
        name: 'Detail Test Corp.',
        instrumentClass: 'Stock',
        date: '2026-04-25',
        price: 200,
        quantity: 3,
      });

      const detail = await PortfolioService.getPortfolioDetail(portfolio.id, user.id);

      expect(detail.id).toBe(portfolio.id);
      expect(detail.holdings).toHaveLength(1);
      expect(detail.holdings[0].quantity).toBe(3);
      expect(detail.holdings[0].avgCost).toBeCloseTo(200);
    });

    it('throws NOT_FOUND when portfolio does not belong to user', async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      const portfolio = await PortfolioRepository.create({ name: 'Other', userId: otherUser.id });

      await expect(PortfolioService.getPortfolioDetail(portfolio.id, user.id)).rejects.toThrow();
    });

    it('excludes holdings with zero quantity (fully sold positions)', async () => {
      const user = await createTestUser();
      const portfolio = await PortfolioRepository.create({ name: 'Zero Test', userId: user.id });
      const symbol = `ZERO${Date.now()}`;

      await OperationService.addTransaction({
        userId: user.id,
        portfolioId: portfolio.id,
        side: 'BUY',
        symbol,
        name: 'Zero Corp.',
        instrumentClass: 'Stock',
        date: '2026-04-20',
        price: 100,
        quantity: 5,
      });
      await OperationService.addTransaction({
        userId: user.id,
        portfolioId: portfolio.id,
        side: 'SELL',
        symbol,
        name: 'Zero Corp.',
        instrumentClass: 'Stock',
        date: '2026-04-25',
        price: 120,
        quantity: 5,
      });

      const detail = await PortfolioService.getPortfolioDetail(portfolio.id, user.id);
      expect(detail.holdings).toHaveLength(0);
    });
  });

  describe('createPortfolio', () => {
    it('creates a portfolio and returns it with isFavorite: false when not marked', async () => {
      const user = await UserService.registerUserService({
        firstName: 'Create',
        lastName: 'NoFav',
        email: `create.nofav.${Date.now()}@test.com`,
        password: 'password123',
      });

      const result = await PortfolioService.createPortfolio(user.id, 'My New Portfolio');

      expect(result.name).toBe('My New Portfolio');
      expect(result.id).toBeDefined();
      expect(typeof result.createdAt).toBe('string');
      expect(result.isFavorite).toBe(false);
    });

    it('creates a portfolio and sets it as favorite when isFavorite is true', async () => {
      const user = await UserService.registerUserService({
        firstName: 'Create',
        lastName: 'Fav',
        email: `create.fav.${Date.now()}@test.com`,
        password: 'password123',
      });

      const result = await PortfolioService.createPortfolio(
        user.id,
        'Favorite Portfolio',
        undefined,
        true,
      );

      expect(result.isFavorite).toBe(true);

      const updatedUser = await UserRepository.findById(user.id);
      expect(updatedUser?.favoritePortfolioId).toBe(result.id);
    });

    it('replaces the previous favorite when creating a new one marked as favorite', async () => {
      const user = await UserService.registerUserService({
        firstName: 'Replace',
        lastName: 'Fav',
        email: `replace.fav.${Date.now()}@test.com`,
        password: 'password123',
      });

      const first = await PortfolioService.createPortfolio(user.id, 'First', undefined, true);
      const second = await PortfolioService.createPortfolio(user.id, 'Second', undefined, true);

      const updatedUser = await UserRepository.findById(user.id);
      expect(updatedUser?.favoritePortfolioId).toBe(second.id);
      expect(first.id).not.toBe(second.id);
    });
  });
});
