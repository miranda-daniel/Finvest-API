import { UserService } from '@services/user-services';

export const Query = {
  hello: () => 'Hello, World!',
  // TODO: remove - temporary resolver for testing purposes only
  users: () => UserService.getAllUsersService(),
};
