import { Body, Controller, Post, Route } from 'tsoa';
import { SessionService } from '@services/session-services';
import { loginSchema, LoginUserRequest, Session } from '@typing/session';

@Route('session')
export class SessionController extends Controller {
  /**
   *  Login User.
   * @summary Login user in app.
   * @returns {Session} 200 - Token
   */
  @Post('/login')
  public async login(@Body() body: LoginUserRequest): Promise<Session> {
    loginSchema.parse(body);

    return await SessionService.loginUser(body);
  }
}
