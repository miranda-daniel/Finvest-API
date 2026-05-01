import { db } from '@config/db';

interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const UserRepository = {
  findMany: () =>
    db.user.findMany({
      select: {
        firstName: true,
        lastName: true,
      },
    }),

  findById: (id: number) => db.user.findUnique({ where: { id } }),

  findByIdWithPortfolios: (id: number) =>
    db.user.findUnique({ where: { id }, include: { portfolios: true } }),

  findByEmail: (email: string) => db.user.findUnique({ where: { email } }),

  create: (data: CreateUserData) => db.user.create({ data }),

  update: (id: number, data: Partial<Omit<CreateUserData, 'password'>>) =>
    db.user.update({ where: { id }, data }),

  updatePassword: (id: number, hashedPassword: string) =>
    db.user.update({ where: { id }, data: { password: hashedPassword } }),

  setFavoritePortfolio: (userId: number, portfolioId: number | null) =>
    db.user.update({ where: { id: userId }, data: { favoritePortfolioId: portfolioId } }),
};
