import { hashPassword } from '@helpers/password';
import { UserRepository } from '@repositories/user-repository';
import { RegisterUserRequest, User, UserIndex } from '@typing/user';

export const UserService = {
  // TODO: remove - temporary method for testing purposes only
  getAllUsersService: async (): Promise<User[]> => {
    const users = await UserRepository.findMany();

    return users.map(({ id, email, firstName, lastName, isActive, createdAt }) => ({
      id,
      email,
      firstName,
      lastName,
      isActive,
      createdAt,
    }));
  },

  getUsersService: async (): Promise<UserIndex[]> => {
    const users = await UserRepository.findMany();

    return users.map(({ firstName, lastName }) => ({ firstName, lastName }));
  },

  registerUserService: async (input: RegisterUserRequest): Promise<User> => {
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
  },
};
