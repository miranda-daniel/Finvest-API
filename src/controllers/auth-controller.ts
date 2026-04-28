import { Controller, Get, Post, Route, Security, SuccessResponse, Request } from '@tsoa/runtime';
import type { Request as ExpressRequest } from 'express';
import { SessionService } from '@services/session-service';
import { ActiveSession, TokenPayload } from '@typing/session';
import { MessageResponse } from '@typing/common';
import { buildRefreshCookie } from '@helpers/token';

// Authenticated session management endpoints — JWT required.
// Separated from /session (public) so the auth rate limiter applies only to public routes.
@Route('auth')
export class AuthController extends Controller {
  /**
   * List all active sessions for the authenticated user.
   * @summary List active sessions
   */
  @Security('jwt')
  @Get('/sessions')
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
  @Post('/sessions/revoke-all')
  public async revokeAllSessions(@Request() request: ExpressRequest): Promise<MessageResponse> {
    const { userId } = (request as unknown as { user: TokenPayload }).user;
    const ip = request.ip ?? 'unknown';

    await SessionService.revokeAllSessions(userId, ip);
    this.setHeader('Set-Cookie', buildRefreshCookie('', 0));

    return { message: 'All sessions revoked' };
  }
}
