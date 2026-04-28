import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { Prisma } from '@generated/prisma';
import { comparePasswords, hashPassword } from '@helpers/password';
import { UserRepository } from '@repositories/user-repository';
import { RegisterUserRequest, User, UserIndex } from '@typing/user';

export const UserService = {
  getUsers: async (): Promise<UserIndex[]> => {
    const users = await UserRepository.findMany();

    return users.map(({ firstName, lastName }) => ({ firstName, lastName }));
  },

  changePassword: async (
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> => {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new ApiError(errors.NOT_FOUND);
    }

    const valid = await comparePasswords(currentPassword, user.password);
    if (!valid) {
      throw new ApiError(errors.INVALID_CREDENTIALS);
    }

    const hashed = await hashPassword(newPassword);
    await UserRepository.updatePassword(userId, hashed);
  },

  register: async (input: RegisterUserRequest): Promise<User> => {
    const { firstName, lastName, email, password } = input;

    const hashedPassword = await hashPassword(password);

    try {
      const userCreated = await UserRepository.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
      });

      const { password: _, ...user } = userCreated;

      return user;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ApiError(errors.USER_ALREADY_EXISTS);
      }
      throw err;
    }
  },
};
