import { db } from '@config/db';
import { RegisterUserRequest } from '@typing/user';

export const UserRepository = {
  findMany: () => db.user.findMany(),

  findById: (id: number) => db.user.findUnique({ where: { id } }),

  findByIdWithPortfolios: (id: number) =>
    db.user.findUnique({ where: { id }, include: { portfolios: true } }),

  findByEmail: (email: string) => db.user.findUnique({ where: { email } }),

  create: (data: RegisterUserRequest) => db.user.create({ data }),

  update: (id: number, data: Partial<Omit<RegisterUserRequest, 'password'>>) =>
    db.user.update({ where: { id }, data }),

  updatePassword: (id: number, hashedPassword: string) =>
    db.user.update({ where: { id }, data: { password: hashedPassword } }),

  setFavoritePortfolio: (userId: number, portfolioId: number | null) =>
    db.user.update({ where: { id: userId }, data: { favoritePortfolioId: portfolioId } }),
};
