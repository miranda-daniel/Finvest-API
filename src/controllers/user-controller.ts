import { Body, Get, Security, Controller, Post, Route } from 'tsoa';
import { UserService } from '@services/user-services';
import {
  registerUserSchema,
  RegisterUserRequest,
  User,
  UserIndex,
} from '@typing/user';

@Route('users')
export class UserController extends Controller {
  /**
   *  Register User.
   * @summary Register new user in database.
   * @returns {User} 200 - User
   */
  @Post('/')
  public async register(
    @Body() requestBody: RegisterUserRequest,
  ): Promise<User> {
    registerUserSchema.parse(requestBody);

    return await UserService.registerUserService(requestBody);
  }

  /**
   *  Index - Get all users.
   * @summary Get a list of all users.
   * @returns {User[]} 200 - List of users
   */
  @Get('/')
  @Security('jwt')
  public async getAllUsers(): Promise<UserIndex[]> {
    return await UserService.getUsersService();
  }
}
