import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { Prisma } from '@generated/prisma';
import { hashPassword } from '@helpers/password';
import { UserRepository } from '@repositories/user-repository';
import { RegisterUserRequest, User, UserIndex } from '@typing/user';

export const UserService = {
  getUsersService: async (): Promise<UserIndex[]> => {
    const users = await UserRepository.findMany();

    return users.map(({ firstName, lastName }) => ({ firstName, lastName }));
  },

  registerUserService: async (input: RegisterUserRequest): Promise<User> => {
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
