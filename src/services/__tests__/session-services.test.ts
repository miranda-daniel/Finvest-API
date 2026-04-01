import { SessionService } from '@services/session-services';
import { UserService } from '@services/user-services';
import { ApiError } from '@config/api-error';

describe('SessionService', () => {
  describe('loginUser', () => {
    it('returns a JWT token on valid credentials', async () => {
      const email = `login.valid.${Date.now()}@test.com`;

      await UserService.registerUserService({
        firstName: 'Login',
        lastName: 'User',
        email,
        password: 'password123',
      });

      const result = await SessionService.loginUser({
        email,
        password: 'password123',
      });

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('throws ApiError when the user does not exist', async () => {
      await expect(
        SessionService.loginUser({
          email: 'nobody.session@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ApiError);
    });

    it('throws ApiError when the password is incorrect', async () => {
      const email = `login.wrong.${Date.now()}@test.com`;

      await UserService.registerUserService({
        firstName: 'Wrong',
        lastName: 'Pass',
        email,
        password: 'password123',
      });

      await expect(
        SessionService.loginUser({ email, password: 'wrongpassword' }),
      ).rejects.toThrow(ApiError);
    });
  });
});
