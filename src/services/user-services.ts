import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { hashPassword } from '@helpers/utils';
import { UserRepository } from '@repositories/user-repository';
import { RegisterUserRequest, User, UserIndex } from '@typing/user';
import { Prisma } from '../generated/prisma';

export class UserService {
  static getUsersService = async (): Promise<UserIndex[]> => {
    try {
      const users = await UserRepository.findMany();

      return users.map(({ firstName, lastName }) => ({ firstName, lastName }));
    } catch (_err) {
      throw new ApiError(errors.INTERNAL_SERVER_ERROR);
    }
  };

  static registerUserService = async (
    input: RegisterUserRequest
  ): Promise<User> => {
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
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ApiError(errors.USER_ALREADY_EXISTS);
      }
      throw new ApiError(errors.INTERNAL_SERVER_ERROR);
    }
  };
}
