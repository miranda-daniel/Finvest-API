import { PortfolioRepository } from '@repositories/portfolio-repository';
import { UserRepository } from '@repositories/user-repository';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { Portfolio } from '@typing/portfolio';

export type { Portfolio };

export const PortfolioService = {
  createPortfolio: async (
    userId: number,
    name: string,
    description?: string,
    isFavorite?: boolean,
  ): Promise<Portfolio> => {
    const portfolio = isFavorite
      ? await PortfolioRepository.createAndSetFavorite({ name, description, userId })
      : await PortfolioRepository.create({ name, description, userId });

    const user = await UserRepository.findByIdWithPortfolios(userId);

    return {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description ?? null,
      createdAt: portfolio.createdAt.toISOString(),
      isFavorite: user?.favoritePortfolioId === portfolio.id,
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
      throw new ApiError(errors.NOT_FOUND);
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
    const user = await UserRepository.findByIdWithPortfolios(userId);

    if (!user) {
      throw new ApiError(errors.NOT_FOUND);
    }

    if (user.portfolios.length === 0) {
      return [];
    }

    return user.portfolios.map(({ id, name, description, createdAt }) => ({
      id,
      name,
      description: description ?? null,
      createdAt: createdAt.toISOString(),
      isFavorite: user.favoritePortfolioId === id,
    }));
  },
};
