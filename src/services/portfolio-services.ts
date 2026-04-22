import { PortfolioRepository } from '@repositories/portfolio-repository';
import { UserRepository } from '@repositories/user-repository';

export interface Portfolio {
  id: number;
  name: string;
  createdAt: string;
  isFavorite: boolean;
}

export class PortfolioService {
  static createPortfolio = async (
    userId: number,
    name: string,
    isFavorite?: boolean,
  ): Promise<Portfolio> => {
    const portfolio = await PortfolioRepository.create({ name, userId });

    if (isFavorite) {
      await UserRepository.setFavoritePortfolio(userId, portfolio.id);
    }

    return {
      id: portfolio.id,
      name: portfolio.name,
      createdAt: portfolio.createdAt.toISOString(),
      isFavorite: !!isFavorite,
    };
  };

  static getPortfoliosByUserId = async (userId: number): Promise<Portfolio[]> => {
    const [portfolios, user] = await Promise.all([
      PortfolioRepository.findManyByUserId(userId),
      UserRepository.findById(userId),
    ]);

    return portfolios.map(({ id, name, createdAt }) => ({
      id,
      name,
      createdAt: createdAt.toISOString(),
      isFavorite: user?.favoritePortfolioId === id,
    }));
  };
}
