import { db } from '@root/prisma/db';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';
import { hashPassword } from '@helpers/utils';
import { UserSerializer } from '@serializers/user-seralizer';
import { RegisterUserRequest, User, UserIndex, UserRaw } from '@typing/user';

export class UserService {
  static getUsersService = async () => {
    try {
      const usersListRaw = await db.user.findMany();

      return UserSerializer.serializeUserListIndex(usersListRaw) as UserIndex[];
    } catch (err) {
      throw new ApiError(errors.INTERNAL_SERVER_ERROR);
    }
  };

  static registerUserService = async (input: RegisterUserRequest) => {
    const { firstName, lastName, email, password } = input;

    const hashedPassword = await hashPassword(password);

    let userCreated: UserRaw;

    try {
      userCreated = await db.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
        },
      });

      return UserSerializer.serialize(userCreated) as User;
    } catch (err) {
      throw new ApiError(errors.USER_ALREADY_EXISTS);
    }
  };
}
