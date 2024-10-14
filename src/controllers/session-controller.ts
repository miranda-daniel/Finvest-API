import { Body, Controller, Post, Route } from 'tsoa';
import { SessionService } from '@services/session-services';
import { loginValidations } from '@helpers/validations/login-validations';
import { LoginUserRequest } from '@typing/session';

@Route('session')
export class SessionController extends Controller {
  /**
   *  Login User.
   * @summary Login user in app.
   * @returns {Session} 200 - Token
   */
  @Post('/login')
  public async login(@Body() body: LoginUserRequest) {
    const errorsList = loginValidations(body);

    if (errorsList.length) {
      return {
        errors: errorsList,
        token: null,
      };
    }

    return await SessionService.loginUser(body);
  }
}
