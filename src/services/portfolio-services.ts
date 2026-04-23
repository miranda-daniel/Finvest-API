import { PortfolioRepository } from '@repositories/portfolio-repository';
import { UserRepository } from '@repositories/user-repository';
import { Portfolio } from '@typing/portfolio';

export type { Portfolio };

export const PortfolioService = {
  createPortfolio: async (
    userId: number,
    name: string,
    description?: string,
    isFavorite?: boolean,
  ): Promise<Portfolio> => {
    const portfolio = await PortfolioRepository.create({ name, description, userId });

    if (isFavorite) {
      await UserRepository.setFavoritePortfolio(userId, portfolio.id);
    }

    return {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description ?? null,
      createdAt: portfolio.createdAt.toISOString(),
      isFavorite: !!isFavorite,
    };
  },

  setFavoritePortfolio: async (
    userId: number,
    portfolioId: number | null,
  ): Promise<Portfolio | null> => {
    if (portfolioId === null) {
      await UserRepository.setFavoritePortfolio(userId, null);
      return null;
    }

    const portfolio = await PortfolioRepository.findById(portfolioId);
    if (!portfolio || portfolio.userId !== userId) {
      return null;
    }

    await UserRepository.setFavoritePortfolio(userId, portfolioId);

    return {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description ?? null,
      createdAt: portfolio.createdAt.toISOString(),
      isFavorite: true,
    };
  },

  getPortfoliosByUserId: async (userId: number): Promise<Portfolio[]> => {
    const [portfolios, user] = await Promise.all([
      PortfolioRepository.findManyByUserId(userId),
      UserRepository.findById(userId),
    ]);

    return portfolios.map(({ id, name, description, createdAt }) => ({
      id,
      name,
      description: description ?? null,
      createdAt: createdAt.toISOString(),
      isFavorite: user?.favoritePortfolioId === id,
    }));
  },
};
