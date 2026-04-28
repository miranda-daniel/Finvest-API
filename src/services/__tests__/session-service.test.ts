import { SessionService } from '@services/session-service';
import { UserService } from '@services/user-service';
import { ApiError } from '@config/api-error';
import { generateRefreshToken, hashToken } from '@helpers/token';
import { RefreshTokenRepository } from '@repositories/refresh-token-repository';

const TEST_IP = '127.0.0.1';

describe('SessionService', () => {
  describe('loginUser', () => {
    it('returns a jwtToken on valid credentials', async () => {
      const email = `login.valid.${Date.now()}@test.com`;

      await UserService.register({
        firstName: 'Login',
        lastName: 'User',
        email,
        password: 'password123',
      });

      const result = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);

      expect(result.jwtToken).toBeDefined();
      expect(typeof result.jwtToken).toBe('string');
    });

    it('returns a rawRefreshToken on valid credentials', async () => {
      const email = `login.refresh.${Date.now()}@test.com`;

      await UserService.register({
        firstName: 'Login',
        lastName: 'User',
        email,
        password: 'password123',
      });

      const result = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);

      expect(result.rawRefreshToken).toBeDefined();
      expect(typeof result.rawRefreshToken).toBe('string');
    });

    it('throws ApiError when the user does not exist', async () => {
      await expect(
        SessionService.loginUser(
          { email: 'nobody.session@test.com', password: 'password123' },
          TEST_IP,
        ),
      ).rejects.toThrow(ApiError);
    });

    it('throws ApiError when the password is incorrect', async () => {
      const email = `login.wrong.${Date.now()}@test.com`;

      await UserService.register({
        firstName: 'Wrong',
        lastName: 'Pass',
        email,
        password: 'password123',
      });

      await expect(
        SessionService.loginUser({ email, password: 'wrongpassword' }, TEST_IP),
      ).rejects.toThrow(ApiError);
    });

    it('returns user data alongside the token on valid credentials', async () => {
      const email = `login.userdata.${Date.now()}@test.com`;

      await UserService.register({
        firstName: 'Data',
        lastName: 'Test',
        email,
        password: 'password123',
      });

      const result = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.firstName).toBe('Data');
      expect(result.user.lastName).toBe('Test');
      expect(result.user.id).toBeDefined();
      expect(typeof result.user.id).toBe('number');
    });
  });

  describe('refreshToken', () => {
    it('returns a new jwtToken and rawRefreshToken on valid token', async () => {
      const email = `refresh.valid.${Date.now()}@test.com`;

      await UserService.register({
        firstName: 'Refresh',
        lastName: 'User',
        email,
        password: 'password123',
      });

      const login = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);
      const result = await SessionService.refreshToken(login.rawRefreshToken, TEST_IP);

      expect(result.jwtToken).toBeDefined();
      expect(typeof result.jwtToken).toBe('string');
      expect(result.rawRefreshToken).toBeDefined();
      expect(result.rawRefreshToken).not.toBe(login.rawRefreshToken);
    });

    it('throws ApiError when token does not exist in DB', async () => {
      await expect(SessionService.refreshToken('nonexistent-token-value', TEST_IP)).rejects.toThrow(
        ApiError,
      );
    });

    it('throws ApiError and revokes token family when token is already revoked', async () => {
      const email = `refresh.revoked.${Date.now()}@test.com`;

      await UserService.register({
        firstName: 'Revoked',
        lastName: 'User',
        email,
        password: 'password123',
      });

      const login = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);
      // Use it once legitimately to rotate
      await SessionService.refreshToken(login.rawRefreshToken, TEST_IP);
      // Try to reuse the original (now revoked) token — simulates theft
      await expect(SessionService.refreshToken(login.rawRefreshToken, TEST_IP)).rejects.toThrow(
        ApiError,
      );
    });

    it('throws ApiError when token is expired', async () => {
      const email = `refresh.expired.${Date.now()}@test.com`;

      const user = await UserService.register({
        firstName: 'Expired',
        lastName: 'User',
        email,
        password: 'password123',
      });

      // Manually create a token that expired in the past
      const raw = generateRefreshToken();
      const hash = hashToken(raw);

      await RefreshTokenRepository.create({
        token: hash,
        userId: user.id,
        expires: new Date(Date.now() - 1000), // already expired
        createdByIp: '127.0.0.1',
      });

      await expect(SessionService.refreshToken(raw, TEST_IP)).rejects.toThrow(ApiError);
    });
  });

  describe('logoutUser', () => {
    it('revokes the refresh token on logout', async () => {
      const email = `logout.valid.${Date.now()}@test.com`;

      await UserService.register({
        firstName: 'Logout',
        lastName: 'User',
        email,
        password: 'password123',
      });

      const login = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);
      await SessionService.logoutUser(login.rawRefreshToken, TEST_IP);

      // Token should now be revoked — refreshToken should throw
      await expect(SessionService.refreshToken(login.rawRefreshToken, TEST_IP)).rejects.toThrow(
        ApiError,
      );
    });

    it('does not throw when given an unknown token (idempotent)', async () => {
      await expect(SessionService.logoutUser('unknown-raw-token', TEST_IP)).resolves.not.toThrow();
    });
  });

  describe('listActiveSessions', () => {
    it('returns active sessions for a user', async () => {
      const email = `sessions.list.${Date.now()}@test.com`;
      const user = await UserService.register({
        firstName: 'Sessions',
        lastName: 'Test',
        email,
        password: 'password123',
      });

      await SessionService.loginUser(
        { email, password: 'password123' },
        '127.0.0.1',
        'Mozilla/5.0',
      );

      const sessions = await SessionService.listActiveSessions(user.id);
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].id).toBeDefined();
      expect(sessions[0].createdByIp).toBe('127.0.0.1');
      expect(sessions[0].userAgent).toBe('Mozilla/5.0');
    });

    it('returns empty array when user has no active sessions', async () => {
      const email = `sessions.empty.${Date.now()}@test.com`;
      const user = await UserService.register({
        firstName: 'NoSession',
        lastName: 'Test',
        email,
        password: 'password123',
      });

      const sessions = await SessionService.listActiveSessions(user.id);
      expect(sessions).toEqual([]);
    });
  });

  describe('revokeAllSessions', () => {
    it('revokes all active sessions for a user', async () => {
      const email = `sessions.revoke.${Date.now()}@test.com`;
      const user = await UserService.register({
        firstName: 'Revoke',
        lastName: 'All',
        email,
        password: 'password123',
      });

      const login = await SessionService.loginUser({ email, password: 'password123' }, '127.0.0.1');
      await SessionService.revokeAllSessions(user.id, '127.0.0.1');

      await expect(SessionService.refreshToken(login.rawRefreshToken, '127.0.0.1')).rejects.toThrow(
        ApiError,
      );

      const sessions = await SessionService.listActiveSessions(user.id);
      expect(sessions).toEqual([]);
    });
  });
});
