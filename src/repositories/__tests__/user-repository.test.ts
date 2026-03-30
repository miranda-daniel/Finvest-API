import { UserRepository } from '@repositories/user-repository';

describe('UserRepository', () => {
  describe('create', () => {
    it('creates and returns a user with all fields', async () => {
      const user = await UserRepository.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.repo@test.com',
        password: 'hashedpassword',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('john.repo@test.com');
      expect(user.firstName).toBe('John');
      expect(user.password).toBe('hashedpassword');
    });
  });

  describe('findByEmail', () => {
    it('returns the user when the email exists', async () => {
      await UserRepository.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.repo@test.com',
        password: 'hash',
      });

      const found = await UserRepository.findByEmail('jane.repo@test.com');

      expect(found).not.toBeNull();
      expect(found!.email).toBe('jane.repo@test.com');
    });

    it('returns null when the email does not exist', async () => {
      const found = await UserRepository.findByEmail('nobody@test.com');

      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the user when the id exists', async () => {
      const created = await UserRepository.create({
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob.repo@test.com',
        password: 'hash',
      });

      const found = await UserRepository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('returns null when the id does not exist', async () => {
      const found = await UserRepository.findById(999999);

      expect(found).toBeNull();
    });
  });

  describe('findMany', () => {
    it('returns an array that includes all created users', async () => {
      await UserRepository.create({
        firstName: 'Alice',
        lastName: 'A',
        email: 'alice.repo@test.com',
        password: 'hash',
      });

      const users = await UserRepository.findMany();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('update', () => {
    it('updates and returns the modified user', async () => {
      const created = await UserRepository.create({
        firstName: 'Carol',
        lastName: 'C',
        email: 'carol.repo@test.com',
        password: 'hash',
      });

      const updated = await UserRepository.update(created.id, {
        firstName: 'Caroline',
      });

      expect(updated.firstName).toBe('Caroline');
      expect(updated.id).toBe(created.id);
    });
  });
});
