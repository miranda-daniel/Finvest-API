import {
  Body,
  Controller,
  Get,
  Post,
  Route,
  Security,
  SuccessResponse,
  Request,
} from '@tsoa/runtime';
import type { Request as ExpressRequest } from 'express';
import { SessionService } from '@services/session-services';
import {
  LoginUserRequest,
  Session,
  RefreshTokenResponse,
  ActiveSession,
  TokenPayload,
} from '@typing/session';
import { REFRESH_TOKEN_COOKIE_MAX_AGE, buildRefreshCookie } from '@helpers/token';
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

  /**
   * List all active sessions for the authenticated user.
   * @summary List active sessions
   */
  @Security('jwt')
  @Get('/')
  public async getActiveSessions(@Request() request: ExpressRequest): Promise<ActiveSession[]> {
    const { userId } = (request as unknown as { user: TokenPayload }).user;
    return SessionService.listActiveSessions(userId);
  }

  /**
   * Revoke all active sessions for the authenticated user.
   * @summary Revoke all sessions
   */
  @Security('jwt')
  @SuccessResponse(200, 'All sessions revoked')
  @Post('/revoke-all')
  public async revokeAllSessions(@Request() request: ExpressRequest): Promise<{ message: string }> {
    const { userId } = (request as unknown as { user: TokenPayload }).user;
    const ip = request.ip ?? 'unknown';
    await SessionService.revokeAllSessions(userId, ip);
    this.setHeader('Set-Cookie', buildRefreshCookie('', 0));
    return { message: 'All sessions revoked' };
  }
}
