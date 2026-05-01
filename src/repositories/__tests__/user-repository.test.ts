import { UserRepository } from '@repositories/user-repository';
import { PortfolioRepository } from '@repositories/portfolio-repository';

describe('UserRepository', () => {
  describe('create', () => {
    it('creates and returns a user with all fields', async () => {
      const email = `john.repo.${Date.now()}@test.com`;

      const user = await UserRepository.create({
        firstName: 'John',
        lastName: 'Doe',
        email,
        password: 'hashedpassword',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.firstName).toBe('John');
      expect(user.password).toBe('hashedpassword');
    });
  });

  describe('findByEmail', () => {
    it('returns the user when the email exists', async () => {
      const email = `jane.repo.${Date.now()}@test.com`;

      await UserRepository.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email,
        password: 'hash',
      });

      const found = await UserRepository.findByEmail(email);

      expect(found).not.toBeNull();
      expect(found!.email).toBe(email);
    });

    it('returns null when the email does not exist', async () => {
      const found = await UserRepository.findByEmail('nobody.repo@test.com');

      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the user when the id exists', async () => {
      const email = `bob.repo.${Date.now()}@test.com`;

      const created = await UserRepository.create({
        firstName: 'Bob',
        lastName: 'Smith',
        email,
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
    it('returns an array that includes the created user', async () => {
      await UserRepository.create({
        firstName: 'Alice',
        lastName: 'Repo',
        email: `alice.repo.${Date.now()}@test.com`,
        password: 'hash',
      });

      const users = await UserRepository.findMany();

      expect(Array.isArray(users)).toBe(true);
      expect(users.some((u) => u.firstName === 'Alice' && u.lastName === 'Repo')).toBe(true);
    });
  });

  describe('update', () => {
    it('updates and returns the modified user', async () => {
      const email = `carol.repo.${Date.now()}@test.com`;

      const created = await UserRepository.create({
        firstName: 'Carol',
        lastName: 'C',
        email,
        password: 'hash',
      });

      const updated = await UserRepository.update(created.id, {
        firstName: 'Caroline',
      });

      expect(updated.firstName).toBe('Caroline');
      expect(updated.id).toBe(created.id);
    });
  });

  describe('setFavoritePortfolio', () => {
    it('sets the favorite portfolio id on a user', async () => {
      const user = await UserRepository.create({
        firstName: 'Fav',
        lastName: 'Test',
        email: `fav.set.${Date.now()}@test.com`,
        password: 'hash',
      });
      const portfolio = await PortfolioRepository.create({ name: 'My Portfolio', userId: user.id });

      const updated = await UserRepository.setFavoritePortfolio(user.id, portfolio.id);

      expect(updated.favoritePortfolioId).toBe(portfolio.id);
    });

    it('unsets the favorite portfolio when called with null', async () => {
      const user = await UserRepository.create({
        firstName: 'Fav',
        lastName: 'Unset',
        email: `fav.unset.${Date.now()}@test.com`,
        password: 'hash',
      });
      const portfolio = await PortfolioRepository.create({ name: 'My Portfolio', userId: user.id });
      await UserRepository.setFavoritePortfolio(user.id, portfolio.id);

      const updated = await UserRepository.setFavoritePortfolio(user.id, null);

      expect(updated.favoritePortfolioId).toBeNull();
    });
  });
});
