import { Body, Get, Security, Controller, Post, Route } from 'tsoa';
import { UserService } from '@services/user-services';
import { registerValidations } from '@helpers/validations/register-validations';
import { RegisterUserRequest, User, UserIndex } from '@typing/user';
import { ErrorMessage } from '@typing/session';

@Route('users')
export class UserController extends Controller {
  /**
   *  Register User.
   * @summary Register new user in database.
   * @returns {User} 200 - User
   */
  @Post('/')
  public async register(
    @Body() requestBody: RegisterUserRequest
  ): Promise<User | ErrorMessage[]> {
    const errorsList = registerValidations(requestBody);

    if (errorsList.length) {
      return errorsList;
    }

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
