import { Body, Controller, Post, Route, SuccessResponse, Request } from '@tsoa/runtime';
import type { Request as ExpressRequest } from 'express';
import { SessionService } from '@services/session-services';
import { LoginUserRequest, Session, RefreshTokenResponse } from '@typing/session';
import { REFRESH_TOKEN_COOKIE_MAX_AGE, buildRefreshCookie } from '@helpers/token';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';

// Public session endpoints — no JWT required.
// These are rate-limited at the middleware level (app.use('/session', authRateLimit)).
//
// TSOA reads the decorators and auto-generates src/routes/routes.ts.
// Do not edit routes.ts manually — regenerate with `npm run build`.
@Route('session')
export class SessionController extends Controller {
  /**
   * Login user and receive a JWT + refresh token cookie.
   * @summary Login user
   */
  @Post('/login')
  public async login(
    @Body() body: LoginUserRequest,
    @Request() request: ExpressRequest,
  ): Promise<Session> {
    const ip = request.ip ?? 'unknown';
    const userAgent = request.headers['user-agent'];

    const { rawRefreshToken, ...session } = await SessionService.loginUser(body, ip, userAgent);

    this.setHeader('Set-Cookie', buildRefreshCookie(rawRefreshToken, REFRESH_TOKEN_COOKIE_MAX_AGE));

    return session;
  }

  /**
   * Refresh the JWT using the HTTP-only refresh token cookie.
   * @summary Refresh JWT
   */
  @Post('/refresh-token')
  public async refreshToken(@Request() request: ExpressRequest): Promise<RefreshTokenResponse> {
    const rawToken = (request.cookies as Record<string, string | undefined>)?.refreshToken;

    if (!rawToken) {
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    const ip = request.ip ?? 'unknown';

    try {
      const { rawRefreshToken, jwtToken } = await SessionService.refreshToken(rawToken, ip);
      this.setHeader(
        'Set-Cookie',
        buildRefreshCookie(rawRefreshToken, REFRESH_TOKEN_COOKIE_MAX_AGE),
      );

      return { jwtToken };
    } catch (err) {
      this.setHeader('Set-Cookie', buildRefreshCookie('', 0));
      throw err;
    }
  }

  /**
   * Logout — revokes the refresh token and clears the cookie.
   * @summary Logout user
   */
  @SuccessResponse(200, 'Logged out')
  @Post('/logout')
  public async logout(@Request() request: ExpressRequest): Promise<{ message: string }> {
    const rawToken = (request.cookies as Record<string, string | undefined>)?.refreshToken;
    const ip = request.ip ?? 'unknown';

    if (rawToken) {
      await SessionService.logoutUser(rawToken, ip);
    }

    this.setHeader('Set-Cookie', buildRefreshCookie('', 0));

    return { message: 'Logged out successfully' };
  }
}
