import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import logger from '@config/logger';
import { hashPassword } from '@helpers/utils';
import { UserRepository } from '@repositories/user-repository';
import { RegisterUserRequest, User, UserIndex } from '@typing/user';

export class UserService {
  static getUsersService = async (): Promise<UserIndex[]> => {
    try {
      const users = await UserRepository.findMany();

      return users.map(({ firstName, lastName }) => ({ firstName, lastName }));
    } catch (err) {
      logger.error(`getUsersService failed: ${err}`);
      throw new ApiError(errors.INTERNAL_SERVER_ERROR);
    }
  };

  static registerUserService = async (
    input: RegisterUserRequest,
  ): Promise<User> => {
    const { firstName, lastName, email, password } = input;

    const hashedPassword = await hashPassword(password);

    const userCreated = await UserRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    const { password: _, ...user } = userCreated;

    return user;
  };
}
