import { UserService } from '@services/user-service';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';

describe('UserService', () => {
  describe('register', () => {
    it('creates a user and returns it without the password field', async () => {
      const email = `john.svc.${Date.now()}@test.com`;

      const result = await UserService.register({
        firstName: 'John',
        lastName: 'Doe',
        email,
        password: 'password123',
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe(email);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect((result as unknown as Record<string, unknown>).password).toBeUndefined();
    });

    it('throws ApiError when the email is already registered', async () => {
      const email = `jane.svc.${Date.now()}@test.com`;
      const data = {
        firstName: 'Jane',
        lastName: 'Doe',
        email,
        password: 'password123',
      };

      await UserService.register(data);

      await expect(UserService.register(data)).rejects.toThrow(ApiError);
    });
  });

  describe('changePassword', () => {
    it('changes the password successfully with correct current password', async () => {
      const email = `change.svc.${Date.now()}@test.com`;
      const user = await UserService.register({
        firstName: 'Change',
        lastName: 'Me',
        email,
        password: 'OldPass123!',
      });

      await expect(
        UserService.changePassword(user.id, 'OldPass123!', 'NewPass456!'),
      ).resolves.toBeUndefined();
    });

    it('throws INVALID_CREDENTIALS when current password is wrong', async () => {
      const email = `wrong.svc.${Date.now()}@test.com`;
      const user = await UserService.register({
        firstName: 'Wrong',
        lastName: 'Pass',
        email,
        password: 'OldPass123!',
      });

      const error = await UserService.changePassword(
        user.id,
        'WrongPassword!',
        'NewPass456!',
      ).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.errorCode).toBe(errors.INVALID_CREDENTIALS.errorCode);
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      const error = await UserService.changePassword(999999, 'AnyPassword!', 'NewPass456!').catch(
        (e) => e,
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error.errorCode).toBe(errors.NOT_FOUND.errorCode);
    });
  });

  describe('getUsers', () => {
    it('returns users with only firstName and lastName', async () => {
      const email = `alice.svc.${Date.now()}@test.com`;

      await UserService.register({
        firstName: 'Alice',
        lastName: 'Smith',
        email,
        password: 'password123',
      });

      const users = await UserService.getUsers();

      const alice = users.find((u) => u.firstName === 'Alice' && u.lastName === 'Smith');
      expect(alice).toBeDefined();
      expect((alice as unknown as Record<string, unknown>).password).toBeUndefined();
      expect((alice as unknown as Record<string, unknown>).email).toBeUndefined();
    });
  });
});
