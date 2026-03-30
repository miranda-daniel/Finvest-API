import { UserService } from '@services/user-services';
import { ApiError } from '@config/api-error';

describe('UserService', () => {
  describe('registerUserService', () => {
    it('creates a user and returns it without the password field', async () => {
      const email = `john.svc.${Date.now()}@test.com`;

      const result = await UserService.registerUserService({
        firstName: 'John',
        lastName: 'Doe',
        email,
        password: 'password123',
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe(email);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(
        (result as unknown as Record<string, unknown>).password
      ).toBeUndefined();
    });

    it('throws ApiError when the email is already registered', async () => {
      const email = `jane.svc.${Date.now()}@test.com`;
      const data = {
        firstName: 'Jane',
        lastName: 'Doe',
        email,
        password: 'password123',
      };

      await UserService.registerUserService(data);

      await expect(UserService.registerUserService(data)).rejects.toThrow(
        ApiError
      );
    });
  });

  describe('getUsersService', () => {
    it('returns users with only firstName and lastName', async () => {
      const email = `alice.svc.${Date.now()}@test.com`;

      await UserService.registerUserService({
        firstName: 'Alice',
        lastName: 'Smith',
        email,
        password: 'password123',
      });

      const users = await UserService.getUsersService();

      const alice = users.find(
        (u) => u.firstName === 'Alice' && u.lastName === 'Smith'
      );
      expect(alice).toBeDefined();
      expect(
        (alice as unknown as Record<string, unknown>).password
      ).toBeUndefined();
      expect(
        (alice as unknown as Record<string, unknown>).email
      ).toBeUndefined();
    });
  });
});
