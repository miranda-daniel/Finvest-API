import { User, UserIndex, UserIndexRaw, UserRaw } from '@typing/user';

enum UsersView {
  UsersIndex = 'usersIndex',
}

class UserSerializer {
  static serializeUserListIndex = (userListRaw: UserRaw[]) =>
    userListRaw.map((user: UserRaw) =>
      UserSerializer.serialize(user, UsersView.UsersIndex)
    );

  static serialize = (userObject: UserRaw, view?: string): object => {
    switch (view) {
      case UsersView.UsersIndex:
        return this.serializeUserIndex(userObject);
      default:
        return this.serializeUser(userObject);
    }
  };

  static serializeUserIndex = (userRaw: UserRaw | UserIndexRaw): UserIndex => ({
    firstName: userRaw.firstName,
    lastName: userRaw.lastName,
  });

  static serializeUser = (userRaw: UserRaw): User => ({
    id: userRaw.id,
    email: userRaw.email,
    firstName: userRaw.firstName,
    lastName: userRaw.lastName,
  });
}

export { UserSerializer };
