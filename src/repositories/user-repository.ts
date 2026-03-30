import { db } from '@config/db';
import { RegisterUserRequest } from '@typing/user';

export const UserRepository = {
  findMany: () => db.user.findMany(),

  findById: (id: number) => db.user.findUnique({ where: { id } }),

  findByEmail: (email: string) => db.user.findUnique({ where: { email } }),

  create: (data: RegisterUserRequest) => db.user.create({ data }),

  update: (id: number, data: Partial<RegisterUserRequest>) =>
    db.user.update({ where: { id }, data }),
};
