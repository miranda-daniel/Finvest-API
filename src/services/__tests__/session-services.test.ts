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

    it('returns user data alongside the token on valid credentials', async () => {
      const email = `login.userdata.${Date.now()}@test.com`;

      await UserService.registerUserService({
        firstName: 'Data',
        lastName: 'Test',
        email,
        password: 'password123',
      });

      const result = await SessionService.loginUser({
        email,
        password: 'password123',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.firstName).toBe('Data');
      expect(result.user.lastName).toBe('Test');
      expect(result.user.id).toBeDefined();
      expect(typeof result.user.id).toBe('number');
    });
  });
});
