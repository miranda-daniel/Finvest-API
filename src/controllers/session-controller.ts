import { Body, Controller, Post, Route, SuccessResponse } from 'tsoa';
import { Request } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { SessionService } from '@services/session-services';
import {
  loginSchema,
  LoginUserRequest,
  Session,
  RefreshTokenResponse,
} from '@typing/session';
import { isProduction } from '@config/environments';
import { REFRESH_TOKEN_COOKIE_MAX_AGE } from '@helpers/token';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';

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
   * Login user and receive a JWT + refresh token cookie.
   * @summary Login user
   */
  @Post('/login')
  public async login(
    @Body() body: LoginUserRequest,
    @Request() request: ExpressRequest,
  ): Promise<Session> {
    loginSchema.parse(body);

    const ip = request.ip ?? 'unknown';
    const { rawRefreshToken, ...session } = await SessionService.loginUser(
      body,
      ip,
    );

    this.setHeader(
      'Set-Cookie',
      buildRefreshCookie(rawRefreshToken, REFRESH_TOKEN_COOKIE_MAX_AGE),
    );

    return session;
  }

  /**
   * Refresh the JWT using the HTTP-only refresh token cookie.
   * @summary Refresh JWT
   */
  @Post('/refresh-token')
  public async refreshToken(
    @Request() request: ExpressRequest,
  ): Promise<RefreshTokenResponse> {
    const rawToken = (request.cookies as Record<string, string | undefined>)
      ?.refreshToken;

    if (!rawToken) {
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    const ip = request.ip ?? 'unknown';
    const { rawRefreshToken, jwtToken } = await SessionService.refreshToken(
      rawToken,
      ip,
    );

    this.setHeader(
      'Set-Cookie',
      buildRefreshCookie(rawRefreshToken, REFRESH_TOKEN_COOKIE_MAX_AGE),
    );

    return { jwtToken };
  }

  /**
   * Logout — revokes the refresh token and clears the cookie.
   * @summary Logout user
   */
  @SuccessResponse(200, 'Logged out')
  @Post('/logout')
  public async logout(
    @Request() request: ExpressRequest,
  ): Promise<{ message: string }> {
    const rawToken = (request.cookies as Record<string, string | undefined>)
      ?.refreshToken;
    const ip = request.ip ?? 'unknown';

    if (rawToken) {
      await SessionService.logoutUser(rawToken, ip);
    }

    this.setHeader('Set-Cookie', buildRefreshCookie('', 0));

    return { message: 'Logged out successfully' };
  }
}

function buildRefreshCookie(value: string, maxAge: number): string {
  const parts = [
    `refreshToken=${value}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/session',
    `Max-Age=${maxAge}`,
  ];
  if (isProduction()) {
    parts.push('Secure');
  }
  return parts.join('; ');
}
