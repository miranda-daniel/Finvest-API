import {
  Body,
  Get,
  Security,
  Controller,
  Post,
  Route,
  Request,
  SuccessResponse,
} from '@tsoa/runtime';
import type { Request as ExpressRequest } from 'express';
import { UserService } from '@services/user-services';
import { ChangePasswordRequest, RegisterUserRequest, User, UserIndex } from '@typing/user';
import { TokenPayload } from '@typing/session';
import { MessageResponse } from '@typing/common';

// REST entry point for user endpoints.
//
// TSOA reads the decorators (@Route, @Post, @Get, @Security, etc.) and
// auto-generates src/routes/routes.ts, which wires each method to an Express
// route. Do not edit routes.ts manually — regenerate it with `npm run build`.
//
// Flow: HTTP request → routes.ts (generated) → Controller method → Service → Repository
@Route('users')
export class UserController extends Controller {
  /**
   * Register User.
   * @summary Register new user in database.
   * @returns {User} 200 - User
   */
  @Post('/')
  public async register(@Body() requestBody: RegisterUserRequest): Promise<User> {
    return await UserService.registerUserService(requestBody);
  }

  /**
   * Index - Get all users.
   * @summary Get a list of all users.
   * @returns {User[]} 200 - List of users
   */
  @Get('/')
  @Security('jwt')
  public async getAllUsers(): Promise<UserIndex[]> {
    return await UserService.getUsersService();
  }

  /**
   * Change the authenticated user's password.
   * @summary Change password
   */
  @SuccessResponse(200, 'Password changed')
  @Post('/change-password')
  @Security('jwt')
  public async changePassword(
    @Body() body: ChangePasswordRequest,
    @Request() request: ExpressRequest,
  ): Promise<MessageResponse> {
    const { userId } = (request as unknown as { user: TokenPayload }).user;
    await UserService.changePasswordService(userId, body.currentPassword, body.newPassword);
    return { message: 'Password changed successfully' };
  }
}
