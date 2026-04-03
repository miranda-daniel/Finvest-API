import { PortfolioRepository } from '@repositories/portfolio-repository';

export interface Portfolio {
  id: number;
  name: string;
  createdAt: Date;
}

export class PortfolioService {
  static getPortfoliosByUserId = async (
    userId: number,
  ): Promise<Portfolio[]> => {
    const portfolios = await PortfolioRepository.findManyByUserId(userId);

    return portfolios.map(({ id, name, createdAt }) => ({
      id,
      name,
      createdAt,
    }));
  };
}
