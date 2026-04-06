import { Body, Controller, Post, Request, Route } from 'tsoa';
import express from 'express';
import { SessionService } from '@services/session-services';
import { loginSchema, LoginUserRequest, Session } from '@typing/session';

// REST entry point for session endpoints (auth).
//
// TSOA reads the decorators (@Route, @Post, @Get, @Security, etc.) and
// auto-generates src/routes/routes.ts, which wires each method to an Express
// route. Do not edit routes.ts manually — regenerate it with `npm run build`.
//
// Flow: HTTP request → routes.ts (generated) → Controller method → Service → Repository
@Route('session')
export class SessionController extends Controller {
  /**
   *  Login User.
   * @summary Login user in app.
   * @returns {Session} 200 - Token
   */
  @Post('/login')
  public async login(
    @Body() body: LoginUserRequest,
    @Request() request: express.Request,
  ): Promise<Session> {
    loginSchema.parse(body);

    const ip = request.ip ?? 'unknown';
    const { rawRefreshToken: _raw, ...session } =
      await SessionService.loginUser(body, ip);

    return session;
  }
}
