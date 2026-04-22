# JWT + Refresh Token Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-token auth (JWT in localStorage) with a dual-token strategy: short-lived JWT in memory + long-lived refresh token in HTTP-only cookie, with rotation and revocation.

**Architecture:** The backend adds a `RefreshToken` DB model, three repository methods, three service methods, and two new REST endpoints. The frontend removes JWT persistence from localStorage, adds an Axios response interceptor for silent token renewal, and initializes auth on protected-route load via a silent refresh call.

**Tech Stack:** TypeScript · Express 5 · TSOA · Prisma 7 · PostgreSQL · `crypto` (Node built-in) · `cookie-parser` · Axios interceptors · Zustand · TanStack Router

**Spec:** `docs/superpowers/specs/2026-04-05-jwt-refresh-token-auth-design.md`

---

## File Map

### Finvest-API (Backend)

| Action | File |
|---|---|
| Modify | `src/middlewares/index-middlewares.ts` |
| Modify | `src/config/errors.ts` |
| Modify | `prisma/schema.prisma` |
| **Create** | `src/helpers/token.ts` |
| **Create** | `src/repositories/refresh-token-repository.ts` |
| **Create** | `src/repositories/__tests__/refresh-token-repository.test.ts` |
| Modify | `src/types/session.ts` |
| Modify | `src/services/session-services.ts` |
| Modify | `src/services/__tests__/session-services.test.ts` |
| Modify | `src/controllers/session-controller.ts` |
| Modify (generated) | `src/routes/routes.ts` |

### Finvest-WEB (Frontend)

| Action | File |
|---|---|
| Modify | `src/stores/auth.store.ts` |
| Modify | `src/api/client.ts` |
| Modify | `src/routes/_authenticated.tsx` |
| **Create** | `src/api/hooks/auth/useLogout.ts` |
| Modify | `src/api/hooks/auth/useLogin.ts` |

---

## Task 1: Install and register cookie-parser

**Files:**
- Modify: `Finvest-API/src/middlewares/index-middlewares.ts`

- [ ] **Step 1: Install cookie-parser**

Run in `Finvest-API/`:
```bash
npm install cookie-parser && npm install --save-dev @types/cookie-parser
```
Expected: `added N packages`

- [ ] **Step 2: Register middleware**

In `src/middlewares/index-middlewares.ts`, add the import and register `cookieParser()` inside `preRoutesMiddleware`:

```typescript
import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet, { HelmetOptions } from 'helmet';
import { errorHandler } from './error-handler-middleware';
import { isProduction } from '@config/environments';

// Relaxed CSP needed for Apollo Sandbox to load external scripts in development
const devHelmetConfig: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
      ],
      imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    },
  },
};

export const preRoutesMiddleware = (app: Application) => {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(helmet(isProduction() ? undefined : devHelmetConfig));
};

export const postRoutesMiddleware = (app: Application) => {
  app.use(errorHandler);
};
```

- [ ] **Step 3: Commit**

```bash
git add src/middlewares/index-middlewares.ts package.json package-lock.json
git commit -m "chore(auth): install and register cookie-parser"
```

---

## Task 2: Add INVALID_REFRESH_TOKEN error

**Files:**
- Modify: `src/config/errors.ts`

- [ ] **Step 1: Add error code**

Replace the contents of `src/config/errors.ts`:

```typescript
export const errors = {
  INVALID_CREDENTIALS: {
    httpCode: 400,
    errorCode: 400_000,
    description: 'Invalid credentials',
  },
  INVALID_USER: {
    httpCode: 400,
    errorCode: 400_001,
    description: 'Invalid user',
  },
  INVALID_TOKEN: {
    httpCode: 400,
    errorCode: 400_003,
    description: 'Invalid token',
  },
  UNAUTHENTICATED: {
    httpCode: 401,
    errorCode: 401_000,
    description: 'Unauthorized',
  },
  EXPIRED_TOKEN: {
    httpCode: 401,
    errorCode: 401_001,
    description: 'Token expired',
  },
  INVALID_REFRESH_TOKEN: {
    httpCode: 401,
    errorCode: 401_002,
    description: 'Invalid or expired refresh token',
  },
  NOT_FOUND: {
    httpCode: 404,
    errorCode: 404_000,
    description: 'Not found',
  },
  USER_ALREADY_EXISTS: {
    httpCode: 409,
    errorCode: 409_000,
    description: 'User already exists',
  },
  VALIDATION_ERROR: {
    httpCode: 422,
    errorCode: 422_000,
    description: 'TSOA Validation error',
  },
  INTERNAL_SERVER_ERROR: {
    httpCode: 500,
    errorCode: 500_000,
    description: 'Internal server error',
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/config/errors.ts
git commit -m "feat(auth): add INVALID_REFRESH_TOKEN error code"
```

---

## Task 3: Add RefreshToken model to Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update schema**

In `prisma/schema.prisma`, add the `RefreshToken` model and its relation on `User`. Replace the `User` model block and add the new model:

```prisma
model User {
  id             Int            @id @default(autoincrement())
  email          String         @unique
  password       String
  firstName      String
  lastName       String
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  portfolios     Portfolio[]
  refreshTokens  RefreshToken[]
}

model RefreshToken {
  id              Int       @id @default(autoincrement())
  token           String    @unique       // SHA-256 hash of the raw token
  userId          Int
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires         DateTime
  createdByIp     String
  revoked         DateTime?
  revokedByIp     String?
  replacedByToken String?   // hash of the token that replaced this one (audit trail)
  createdAt       DateTime  @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
npx dotenv-cli -e .env.test -- npx prisma migrate dev --name add_refresh_token
```
Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```
Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(auth): add RefreshToken model to schema"
```

---

## Task 4: Create token helper

**Files:**
- Create: `src/helpers/token.ts`

- [ ] **Step 1: Create helper**

Create `src/helpers/token.ts`:

```typescript
import crypto from 'crypto';

export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const REFRESH_TOKEN_COOKIE_MAX_AGE = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60; // seconds

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiry(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return expires;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/helpers/token.ts
git commit -m "feat(auth): add token helper (generate, hash, expiry)"
```

---

## Task 5: Create RefreshTokenRepository + tests

**Files:**
- Create: `src/repositories/refresh-token-repository.ts`
- Create: `src/repositories/__tests__/refresh-token-repository.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/repositories/__tests__/refresh-token-repository.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd Finvest-API && npm run test -- --testPathPattern="refresh-token-repository"
```
Expected: FAIL — `RefreshTokenRepository` is not defined.

- [ ] **Step 3: Implement the repository**

Create `src/repositories/refresh-token-repository.ts`:

```typescript
import { db } from '@config/db';
import { RefreshToken } from '@generated/prisma';

export class RefreshTokenRepository {
  static create = async (data: {
    token: string;
    userId: number;
    expires: Date;
    createdByIp: string;
  }): Promise<RefreshToken> => {
    return db.refreshToken.create({ data });
  };

  static findByToken = async (token: string): Promise<RefreshToken | null> => {
    return db.refreshToken.findUnique({ where: { token } });
  };

  static revoke = async (
    id: number,
    ip: string,
    replacedByToken?: string,
  ): Promise<void> => {
    await db.refreshToken.update({
      where: { id },
      data: {
        revoked: new Date(),
        revokedByIp: ip,
        replacedByToken,
      },
    });
  };

  static revokeAllForUser = async (userId: number): Promise<void> => {
    await db.refreshToken.updateMany({
      where: { userId, revoked: null },
      data: { revoked: new Date() },
    });
  };
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm run test -- --testPathPattern="refresh-token-repository"
```
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/repositories/refresh-token-repository.ts src/repositories/__tests__/refresh-token-repository.test.ts
git commit -m "feat(auth): add RefreshTokenRepository with create, find, revoke methods"
```

---

## Task 6: Update session types

**Files:**
- Modify: `src/types/session.ts`

- [ ] **Step 1: Update types**

Replace `src/types/session.ts` with:

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email not valid' }),
  password: z.string().min(1, { message: 'Password required' }),
});

export type LoginUserRequest = z.infer<typeof loginSchema>;

// The user data returned as part of a successful login response.
// Intentionally minimal — only what the frontend needs to display immediately.
export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

// The full response returned by POST /session/login.
export interface Session {
  jwtToken: string;
  user: SessionUser;
}

// Internal result from loginUser service — includes the raw refresh token
// so the controller can set it as an HTTP-only cookie.
// rawRefreshToken is never returned to the client.
export interface LoginResult extends Session {
  rawRefreshToken: string;
}

// Response returned by POST /session/refresh-token.
export interface RefreshTokenResponse {
  jwtToken: string;
}

// Internal result from refreshToken service.
export interface RefreshResult extends RefreshTokenResponse {
  rawRefreshToken: string;
}

export interface TokenPayload {
  userId: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/session.ts
git commit -m "refactor(auth): rename token to jwtToken, add LoginResult and RefreshResult types"
```

---

## Task 7: Update loginUser service + fix existing tests

**Files:**
- Modify: `src/services/session-services.ts`
- Modify: `src/services/__tests__/session-services.test.ts`

- [ ] **Step 1: Update the existing tests first (they reference `result.token`)**

Replace `src/services/__tests__/session-services.test.ts` with:

```typescript
import { SessionService } from '@services/session-services';
import { UserService } from '@services/user-services';
import { ApiError } from '@config/api-error';

const TEST_IP = '127.0.0.1';

describe('SessionService', () => {
  describe('loginUser', () => {
    it('returns a jwtToken on valid credentials', async () => {
      const email = `login.valid.${Date.now()}@test.com`;

      await UserService.registerUserService({
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

      await UserService.registerUserService({
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
        SessionService.loginUser({ email: 'nobody.session@test.com', password: 'password123' }, TEST_IP),
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
        SessionService.loginUser({ email, password: 'wrongpassword' }, TEST_IP),
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

      const result = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.firstName).toBe('Data');
      expect(result.user.lastName).toBe('Test');
      expect(result.user.id).toBeDefined();
      expect(typeof result.user.id).toBe('number');
    });
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm run test -- --testPathPattern="session-services"
```
Expected: FAIL — `loginUser` still returns `token` not `jwtToken`, and doesn't accept `ip`.

- [ ] **Step 3: Update loginUser in the service**

Replace `src/services/session-services.ts` with:

```typescript
import JWT from 'jsonwebtoken';
import { ApiError } from '@config/api-error';
import { ENV_VARIABLES } from '@config/config';
import { errors } from '@config/errors';
import { comparePasswords } from '@helpers/password';
import { generateRefreshToken, getRefreshTokenExpiry, hashToken } from '@helpers/token';
import { RefreshTokenRepository } from '@repositories/refresh-token-repository';
import { UserRepository } from '@repositories/user-repository';
import { LoginUserRequest, LoginResult } from '@typing/session';

export class SessionService {
  static loginUser = async (
    credentials: LoginUserRequest,
    ip: string,
  ): Promise<LoginResult> => {
    const { email, password } = credentials;

    const user = await UserRepository.findByEmail(email);

    if (!user) {
      throw new ApiError(errors.INVALID_USER);
    }

    const isMatch = await comparePasswords(password, user.password);

    if (!isMatch) {
      throw new ApiError(errors.INVALID_CREDENTIALS);
    }

    const jwtToken = JWT.sign({ userId: user.id }, ENV_VARIABLES.jwtSignature, {
      expiresIn: ENV_VARIABLES.jwtExpiresIn,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);

    await RefreshTokenRepository.create({
      token: tokenHash,
      userId: user.id,
      expires: getRefreshTokenExpiry(),
      createdByIp: ip,
    });

    return {
      jwtToken,
      rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  };
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm run test -- --testPathPattern="session-services"
```
Expected: PASS — all loginUser tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/services/session-services.ts src/services/__tests__/session-services.test.ts
git commit -m "feat(auth): update loginUser to generate and persist refresh token"
```

---

## Task 8: Add refreshToken service method + tests

**Files:**
- Modify: `src/services/session-services.ts`
- Modify: `src/services/__tests__/session-services.test.ts`

- [ ] **Step 1: Add tests for refreshToken**

First, add two static imports at the top of `src/services/__tests__/session-services.test.ts` (after the existing imports):

```typescript
import { generateRefreshToken, hashToken } from '@helpers/token';
import { RefreshTokenRepository } from '@repositories/refresh-token-repository';
```

Then append this `describe` block inside the outer `describe('SessionService', ...)`:

```typescript
  describe('refreshToken', () => {
    it('returns a new jwtToken and rawRefreshToken on valid token', async () => {
      const email = `refresh.valid.${Date.now()}@test.com`;

      await UserService.registerUserService({
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
      await expect(
        SessionService.refreshToken('nonexistent-token-value', TEST_IP),
      ).rejects.toThrow(ApiError);
    });

    it('throws ApiError and revokes token family when token is already revoked', async () => {
      const email = `refresh.revoked.${Date.now()}@test.com`;

      await UserService.registerUserService({
        firstName: 'Revoked',
        lastName: 'User',
        email,
        password: 'password123',
      });

      const login = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);
      // Use it once legitimately to rotate
      await SessionService.refreshToken(login.rawRefreshToken, TEST_IP);
      // Try to reuse the original (now revoked) token — simulates theft
      await expect(
        SessionService.refreshToken(login.rawRefreshToken, TEST_IP),
      ).rejects.toThrow(ApiError);
    });

    it('throws ApiError when token is expired', async () => {
      const email = `refresh.expired.${Date.now()}@test.com`;

      const user = await UserService.registerUserService({
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

      await expect(
        SessionService.refreshToken(raw, TEST_IP),
      ).rejects.toThrow(ApiError);
    });
  });
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm run test -- --testPathPattern="session-services"
```
Expected: FAIL — `SessionService.refreshToken is not a function`

- [ ] **Step 3: Implement refreshToken in the service**

Add `refreshToken` static method to `SessionService` in `src/services/session-services.ts`. Append to the class (before the closing `}`):

```typescript
  static refreshToken = async (
    rawToken: string,
    ip: string,
  ): Promise<RefreshResult> => {
    const tokenHash = hashToken(rawToken);
    const stored = await RefreshTokenRepository.findByToken(tokenHash);

    if (!stored) {
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    // Theft detection: if already revoked, invalidate entire token family
    if (stored.revoked) {
      await RefreshTokenRepository.revokeAllForUser(stored.userId);
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    if (stored.expires < new Date()) {
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    // Rotate: generate new token, revoke old one
    const newRawToken = generateRefreshToken();
    const newHash = hashToken(newRawToken);

    await RefreshTokenRepository.create({
      token: newHash,
      userId: stored.userId,
      expires: getRefreshTokenExpiry(),
      createdByIp: ip,
    });

    await RefreshTokenRepository.revoke(stored.id, ip, newHash);

    const jwtToken = JWT.sign({ userId: stored.userId }, ENV_VARIABLES.jwtSignature, {
      expiresIn: ENV_VARIABLES.jwtExpiresIn,
    });

    return { jwtToken, rawRefreshToken: newRawToken };
  };
```

Also add the missing imports at the top of `session-services.ts`. The full import block becomes:

```typescript
import JWT from 'jsonwebtoken';
import { ApiError } from '@config/api-error';
import { ENV_VARIABLES } from '@config/config';
import { errors } from '@config/errors';
import { comparePasswords } from '@helpers/password';
import { generateRefreshToken, getRefreshTokenExpiry, hashToken } from '@helpers/token';
import { RefreshTokenRepository } from '@repositories/refresh-token-repository';
import { UserRepository } from '@repositories/user-repository';
import { LoginUserRequest, LoginResult, RefreshResult } from '@typing/session';
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm run test -- --testPathPattern="session-services"
```
Expected: PASS — all loginUser + refreshToken tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/services/session-services.ts src/services/__tests__/session-services.test.ts
git commit -m "feat(auth): add refreshToken service with rotation and theft detection"
```

---

## Task 9: Add logoutUser service method + tests

**Files:**
- Modify: `src/services/session-services.ts`
- Modify: `src/services/__tests__/session-services.test.ts`

- [ ] **Step 1: Add tests for logoutUser**

Append this `describe` block to `src/services/__tests__/session-services.test.ts`:

```typescript
  describe('logoutUser', () => {
    it('revokes the refresh token on logout', async () => {
      const email = `logout.valid.${Date.now()}@test.com`;

      await UserService.registerUserService({
        firstName: 'Logout',
        lastName: 'User',
        email,
        password: 'password123',
      });

      const login = await SessionService.loginUser({ email, password: 'password123' }, TEST_IP);
      await SessionService.logoutUser(login.rawRefreshToken, TEST_IP);

      // Token should now be revoked — refreshToken should throw
      await expect(
        SessionService.refreshToken(login.rawRefreshToken, TEST_IP),
      ).rejects.toThrow(ApiError);
    });

    it('does not throw when given an unknown token (idempotent)', async () => {
      await expect(
        SessionService.logoutUser('unknown-raw-token', TEST_IP),
      ).resolves.not.toThrow();
    });
  });
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm run test -- --testPathPattern="session-services"
```
Expected: FAIL — `SessionService.logoutUser is not a function`

- [ ] **Step 3: Implement logoutUser in the service**

Append `logoutUser` to `SessionService` in `src/services/session-services.ts`:

```typescript
  static logoutUser = async (rawToken: string, ip: string): Promise<void> => {
    const tokenHash = hashToken(rawToken);
    const stored = await RefreshTokenRepository.findByToken(tokenHash);

    if (stored && !stored.revoked) {
      await RefreshTokenRepository.revoke(stored.id, ip);
    }
    // If token not found or already revoked, do nothing (idempotent)
  };
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm run test -- --testPathPattern="session-services"
```
Expected: PASS — all session service tests passing.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
npm run test
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/session-services.ts src/services/__tests__/session-services.test.ts
git commit -m "feat(auth): add logoutUser service"
```

---

## Task 10: Update session controller

**Files:**
- Modify: `src/controllers/session-controller.ts`

- [ ] **Step 1: Replace the controller**

Replace `src/controllers/session-controller.ts` with:

```typescript
import { Body, Controller, Post, Route, Request as TsoaRequest, SuccessResponse } from 'tsoa';
import type { Request as ExpressRequest } from 'express';
import { SessionService } from '@services/session-services';
import { loginSchema, LoginUserRequest, Session, RefreshTokenResponse } from '@typing/session';
import { isProduction } from '@config/environments';
import { REFRESH_TOKEN_COOKIE_MAX_AGE } from '@helpers/token';
import { ApiError } from '@config/api-error';
import { errors } from '@config/errors';

// REST entry point for session endpoints (auth).
//
// TSOA reads the decorators (@Route, @Post, @Get, @Security, etc.) and
// auto-generates src/routes/routes.ts, which wires each method to an Express
// route. Do not edit routes.ts manually — regenerate it with `npm run build`.
//
// Flow: HTTP request → routes.ts (generated) → Controller method → Service → Repository
@Route('session')
export class SessionController extends Controller {
  /**
   * Login user and receive a JWT + refresh token cookie.
   * @summary Login user
   */
  @Post('/login')
  public async login(
    @Body() body: LoginUserRequest,
    @TsoaRequest() request: ExpressRequest,
  ): Promise<Session> {
    loginSchema.parse(body);

    const ip = request.ip ?? 'unknown';
    const { rawRefreshToken, ...session } = await SessionService.loginUser(body, ip);

    this.setHeader('Set-Cookie', buildRefreshCookie(rawRefreshToken, REFRESH_TOKEN_COOKIE_MAX_AGE));

    return session;
  }

  /**
   * Refresh the JWT using the HTTP-only refresh token cookie.
   * @summary Refresh JWT
   */
  @Post('/refresh-token')
  public async refreshToken(
    @TsoaRequest() request: ExpressRequest,
  ): Promise<RefreshTokenResponse> {
    const rawToken = (request.cookies as Record<string, string | undefined>)?.refreshToken;

    if (!rawToken) {
      throw new ApiError(errors.INVALID_REFRESH_TOKEN);
    }

    const ip = request.ip ?? 'unknown';
    const { rawRefreshToken, jwtToken } = await SessionService.refreshToken(rawToken, ip);

    this.setHeader('Set-Cookie', buildRefreshCookie(rawRefreshToken, REFRESH_TOKEN_COOKIE_MAX_AGE));

    return { jwtToken };
  }

  /**
   * Logout — revokes the refresh token and clears the cookie.
   * @summary Logout user
   */
  @SuccessResponse(200, 'Logged out')
  @Post('/logout')
  public async logout(
    @TsoaRequest() request: ExpressRequest,
  ): Promise<{ message: string }> {
    const rawToken = (request.cookies as Record<string, string | undefined>)?.refreshToken;
    const ip = request.ip ?? 'unknown';

    if (rawToken) {
      await SessionService.logoutUser(rawToken, ip);
    }

    // Clear the cookie regardless of whether the token was found
    this.setHeader('Set-Cookie', buildRefreshCookie('', 0));

    return { message: 'Logged out successfully' };
  }
}

function buildRefreshCookie(value: string, maxAge: number): string {
  const parts = [
    `refreshToken=${value}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/session',
    `Max-Age=${maxAge}`,
  ];
  if (isProduction()) parts.push('Secure');
  return parts.join('; ');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/session-controller.ts
git commit -m "feat(auth): add refresh-token and logout endpoints to session controller"
```

---

## Task 11: Regenerate TSOA routes

**Files:**
- Modify (generated): `src/routes/routes.ts`

- [ ] **Step 1: Regenerate**

```bash
npm run update-routes-and-swagger
```
Expected: Routes and swagger files regenerated without errors.

- [ ] **Step 2: Verify the new routes appear in routes.ts**

Open `src/routes/routes.ts` and confirm these three routes exist:
- `POST /session/login`
- `POST /session/refresh-token`
- `POST /session/logout`

- [ ] **Step 3: Run the full test suite one more time**

```bash
npm run test
```
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/routes.ts src/routes/swagger.json
git commit -m "chore(auth): regenerate TSOA routes and swagger for refresh-token and logout"
```

---

## Task 12: Update auth store (Finvest-WEB)

**Files:**
- Modify: `Finvest-WEB/src/stores/auth.store.ts`

- [ ] **Step 1: Replace the store**

Replace `src/stores/auth.store.ts` with:

```typescript
// Auth store — global authentication state for the entire app.
//
// Split persistence strategy:
//   - token: in memory only (never persisted). Lost on reload, recovered via
//     the refresh token flow in _authenticated.tsx. Keeps JWT out of localStorage
//     to eliminate XSS exposure.
//   - user: persisted to localStorage via Zustand `persist` + `partialize`.
//     Not sensitive — avoids UI flash on page reload while the silent refresh runs.
//
// Three consumers, each with a different access pattern:
//   1. Apollo Client (src/graphql/client.ts)
//      → reads token via .getState() (outside React) to inject the
//        Authorization header into every GraphQL request
//   2. TanStack Router (_authenticated.tsx)
//      → reads token via .getState() (outside React) in beforeLoad()
//        to guard routes — triggers silent refresh if token is null
//   3. React components
//      → subscribe via useAuthStore(selector) hook so they re-render
//        only when the specific piece of state they use changes
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
}

interface AuthState {
  token: string | null
  user: User | null
  setToken: (token: string) => void
  login: (token: string, user: User) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      login: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // only user goes to localStorage
    }
  )
)
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/auth.store.ts
git commit -m "refactor(auth): store JWT in memory only, persist user to localStorage"
```

---

## Task 13: Add Axios response interceptor (Finvest-WEB)

**Files:**
- Modify: `Finvest-WEB/src/api/client.ts`

- [ ] **Step 1: Replace client.ts**

Replace `src/api/client.ts` with:

```typescript
// Axios instance — shared HTTP client for all REST requests.
//
// All REST calls must go through this instance (never import axios directly).
//
// Response interceptor handles silent JWT renewal:
//   - On 401: calls POST /session/refresh-token (cookie sent automatically)
//   - On success: stores new JWT in memory, retries original request
//   - On failure: clears auth state and redirects to /login
//   - Concurrent 401s are queued — only one refresh call is made
//
// GraphQL requests go through Apollo Client (src/graphql/client.ts), not this.
import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Queue for requests that arrived while a refresh was already in progress
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token!)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const isRefreshEndpoint = originalRequest.url?.includes('/session/refresh-token')

    // Do not retry refresh calls or already-retried requests
    if (error.response?.status !== 401 || originalRequest._retry || isRefreshEndpoint) {
      return Promise.reject(error)
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return apiClient(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await apiClient.post<{ jwtToken: string }>('/session/refresh-token')
      const { jwtToken } = data

      useAuthStore.getState().setToken(jwtToken)
      processQueue(null, jwtToken)

      originalRequest.headers['Authorization'] = `Bearer ${jwtToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// Helper to extract the error message from an Axios response
export function getApiError(error: unknown, fallback = 'Something went wrong.'): string {
  return (isAxiosError(error) ? error.response?.data?.description : null) ?? fallback
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/client.ts
git commit -m "feat(auth): add Axios response interceptor for silent JWT renewal"
```

---

## Task 14: Update _authenticated.tsx — silent refresh on load

**Files:**
- Modify: `Finvest-WEB/src/routes/_authenticated.tsx`

- [ ] **Step 1: Update the route**

Replace `src/routes/_authenticated.tsx` with:

```typescript
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { apiClient } from '@/api/client'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const store = useAuthStore.getState()

    if (!store.token) {
      // JWT is not in memory (e.g. page reload) — attempt silent refresh
      // using the HTTP-only cookie. If the cookie is missing or expired,
      // the request will fail and we redirect to /login.
      try {
        const { data } = await apiClient.post<{ jwtToken: string }>('/session/refresh-token')
        store.setToken(data.jwtToken)
      } catch {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: () => <Outlet />,
})
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/_authenticated.tsx
git commit -m "feat(auth): silent JWT refresh on protected route load"
```

---

## Task 15: Create useLogout hook (Finvest-WEB)

**Files:**
- Create: `Finvest-WEB/src/api/hooks/auth/useLogout.ts`

- [ ] **Step 1: Create the hook**

Create `src/api/hooks/auth/useLogout.ts`:

```typescript
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { apolloClient } from '@/graphql/client'
import { apiClient } from '@/api/client'

// useLogout — handles logout flow.
//
// Flow:
//   1. Calls POST /session/logout (REST — sends HTTP-only cookie automatically)
//   2. Clears JWT and user from Zustand store
//   3. Clears Apollo cache to avoid stale data on next login
//   4. Navigates to /login
//
// The logout call fires even if the JWT is expired — the backend reads
// the cookie and revokes it regardless of the Authorization header.
export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const router = useRouter()

  const { mutate: logout, isPending: loading } = useMutation({
    mutationFn: () => apiClient.post('/session/logout'),
    onSettled: async () => {
      // Clear auth state regardless of whether the logout request succeeded.
      // The user should always be taken to /login on logout intent.
      clearAuth()
      await apolloClient.clearStore()
      router.navigate({ to: '/login' })
    },
  })

  return { logout, loading }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/hooks/auth/useLogout.ts
git commit -m "feat(auth): add useLogout hook"
```

---

## Task 16: Update useLogin to use jwtToken (Finvest-WEB)

**Files:**
- Modify: `Finvest-WEB/src/api/hooks/auth/useLogin.ts`

- [ ] **Step 1: Update the hook**

Replace `src/api/hooks/auth/useLogin.ts` with:

```typescript
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { apolloClient } from '@/graphql/client'
import { apiClient, getApiError } from '@/api/client'

// Shape of the credentials the user submits on the Sign In form.
interface LoginCredentials {
  email: string
  password: string
}

// Shape of the response returned by POST /session/login.
// Mirrors Session from the API (src/types/session.ts).
interface LoginResponse {
  jwtToken: string
  user: {
    id: number
    email: string
    firstName: string
    lastName: string
  }
}

// useLogin — handles the Sign In form submission.
//
// Flow:
//   1. Calls POST /session/login (REST — auth endpoints use REST per architecture rules)
//   2. On success: stores JWT in memory + user in Zustand (user persisted to localStorage)
//   3. On success: clears Apollo cache to avoid stale data from a previous session
//   4. On success: navigates to /dashboard
//   5. On failure: Axios rejects on 4xx/5xx — error is available via the mutation state
//
// The refresh token is set as an HTTP-only cookie by the backend automatically.
//
// Returns:
//   submit  — function to call with { email, password }
//   loading — true while the request is in flight
//   error   — error message string if the request failed, null otherwise
export function useLogin() {
  const login = useAuthStore((s) => s.login)
  const router = useRouter()

  const {
    mutate: submit,
    isPending: loading,
    error,
  } = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiClient.post<LoginResponse>('/session/login', credentials),
    onSuccess: async ({ data }) => {
      login(data.jwtToken, data.user)
      await apolloClient.clearStore()
      router.navigate({ to: '/dashboard' })
    },
  })

  const errorMessage = error ? getApiError(error, 'Invalid email or password.') : null

  return { submit, loading, error: errorMessage }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/hooks/auth/useLogin.ts
git commit -m "feat(auth): update useLogin to use jwtToken from new API response shape"
```

---

## Deferred (do not implement now)

| What | Notes |
|---|---|
| Cleanup job (BullMQ + Redis) | Purges revoked/expired tokens nightly. Table grows until implemented — no data integrity impact. |
| JWT in HTTP-only cookie | JWT in memory already eliminates XSS. Future hardening step. |
| Rate limiting on `/session/login` | Add `express-rate-limit` before going to production (see `CLAUDE.md` deferred table). |
