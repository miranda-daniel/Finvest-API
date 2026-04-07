import { RefreshTokenRepository } from '@repositories/refresh-token-repository';
import { UserRepository } from '@repositories/user-repository';
import { hashPassword } from '@helpers/password';

async function createTestUser() {
  const email = `refresh.repo.${Date.now()}@test.com`;
  return UserRepository.create({
    email,
    password: await hashPassword('password123'),
    firstName: 'Refresh',
    lastName: 'Test',
  });
}

describe('RefreshTokenRepository', () => {
  describe('create', () => {
    it('stores a hashed refresh token for a user', async () => {
      const user = await createTestUser();
      const hash = 'abc123hashedtoken';
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const token = await RefreshTokenRepository.create({
        token: hash,
        userId: user.id,
        expires,
        createdByIp: '127.0.0.1',
      });

      expect(token.id).toBeDefined();
      expect(token.token).toBe(hash);
      expect(token.userId).toBe(user.id);
      expect(token.revoked).toBeNull();
    });
  });

  describe('findByToken', () => {
    it('returns the token record when found', async () => {
      const user = await createTestUser();
      const hash = `findtest.${Date.now()}`;
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await RefreshTokenRepository.create({
        token: hash,
        userId: user.id,
        expires,
        createdByIp: '127.0.0.1',
      });

      const found = await RefreshTokenRepository.findByToken(hash);
      expect(found).not.toBeNull();
      expect(found!.token).toBe(hash);
    });

    it('returns null when token does not exist', async () => {
      const found = await RefreshTokenRepository.findByToken('nonexistent-hash');
      expect(found).toBeNull();
    });
  });

  describe('revoke', () => {
    it('marks a token as revoked with ip and replacedByToken', async () => {
      const user = await createTestUser();
      const hash = `revoketest.${Date.now()}`;
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const token = await RefreshTokenRepository.create({
        token: hash,
        userId: user.id,
        expires,
        createdByIp: '127.0.0.1',
      });

      await RefreshTokenRepository.revoke(token.id, '192.168.1.1', 'newhash');

      const updated = await RefreshTokenRepository.findByToken(hash);
      expect(updated!.revoked).not.toBeNull();
      expect(updated!.revokedByIp).toBe('192.168.1.1');
      expect(updated!.replacedByToken).toBe('newhash');
    });
  });

  describe('revokeAllForUser', () => {
    it('revokes all active tokens for a user, leaving already-revoked ones unchanged', async () => {
      const user = await createTestUser();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const t1 = await RefreshTokenRepository.create({
        token: `revokeall.1.${Date.now()}`,
        userId: user.id,
        expires,
        createdByIp: '127.0.0.1',
      });
      const t2 = await RefreshTokenRepository.create({
        token: `revokeall.2.${Date.now()}`,
        userId: user.id,
        expires,
        createdByIp: '127.0.0.1',
      });

      // Pre-revoke t1
      await RefreshTokenRepository.revoke(t1.id, '127.0.0.1');

      await RefreshTokenRepository.revokeAllForUser(user.id);

      const updated1 = await RefreshTokenRepository.findByToken(t1.token);
      const updated2 = await RefreshTokenRepository.findByToken(t2.token);

      // t2 must now be revoked
      expect(updated2!.revoked).not.toBeNull();
      // t1 was already revoked — still revoked (unchanged)
      expect(updated1!.revoked).not.toBeNull();
    });
  });
});
