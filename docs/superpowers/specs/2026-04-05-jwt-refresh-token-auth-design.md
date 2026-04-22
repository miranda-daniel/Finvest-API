# JWT + Refresh Token Authentication — Design Spec

**Date:** 2026-04-05  
**Status:** Approved  
**Scope:** Finvest-API + Finvest-WEB

---

## Overview

Replace the current single-token auth (JWT in localStorage) with a dual-token strategy:

- **JWT (access token):** Short-lived (15m), stored in memory only (Zustand, no persist)
- **Refresh token:** Long-lived (7 days, sliding window), stored as HTTP-only cookie + hashed in DB

The refresh flow is **reactive**: the frontend does nothing until a request fails with `401`, then the Axios interceptor silently renews the JWT and retries the original request.

---

## Out of Scope

- Register endpoint (users are created directly in DB for now)
- BullMQ + Redis cleanup job (deferred — see Deferred section)
- JWT in HTTP-only cookie (JWT in memory is already safe; this is a future improvement)
- Rate limiting on `/session/login` (already documented as deferred in `CLAUDE.md`)

---

## Section 1: Database

### New model: `RefreshToken`

```prisma
model RefreshToken {
  id              Int       @id @default(autoincrement())
  token           String    @unique       // SHA-256 hash of the real token
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

### Updated model: `User`

Add relation field:

```prisma
refreshTokens  RefreshToken[]
```

### Key decisions

- The **SHA-256 hash** of the token is stored, never the raw value. If the DB is compromised, tokens are useless.
- `replacedByToken` stores the successor's hash to enable full rotation chain tracing.
- `onDelete: Cascade` — deleting a user deletes all their refresh tokens.

---

## Section 2: Backend

### New files

#### `src/helpers/token.ts`
Pure utility functions. No side effects, no DB access.

- `generateRefreshToken(): string` — generates a cryptographically random string using `crypto.randomBytes()`
- `hashToken(token: string): string` — returns the SHA-256 hex digest

#### `src/repositories/refresh-token-repository.ts`
Only layer that touches the `RefreshToken` table.

- `create(data)` — persists a new refresh token record
- `findByToken(hash: string)` — looks up a token by its hash
- `revoke(id, ip, replacedByHash?)` — sets `revoked`, `revokedByIp`, `replacedByToken`
- `revokeAllForUser(userId)` — revokes all active tokens for a user (theft detection)

### Modified files

#### `src/services/session-services.ts`

- `loginUser` — generates JWT + refresh token, persists refresh token via repo, returns `{ jwtToken, user }`
- `refreshToken(tokenFromCookie, ip)` — validates token (exists, not expired, not revoked), rotates it (revokes old, creates new), returns new JWT
- `logoutUser(tokenFromCookie, ip)` — revokes the active refresh token

Theft detection in `refreshToken`: if the token is already revoked, call `revokeAllForUser` before throwing `401`.

#### `src/controllers/session-controller.ts`

| Method | Route | Description |
|---|---|---|
| `POST` | `/session/login` | Updated — sets HTTP-only cookie with refresh token |
| `POST` | `/session/refresh-token` | New — reads cookie, rotates token, returns new JWT |
| `POST` | `/session/logout` | New — revokes token, clears cookie |

#### `src/types/session.ts`

Add:
- `RefreshTokenResponse` — `{ jwtToken: string }`

Update `Session`:
- Rename `token` → `jwtToken` for clarity

### Cookie configuration

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/session',  // cookie only sent to /session/* routes
}
```

### Refresh token rotation

Every use of a refresh token triggers rotation:
1. Generate new token + hash
2. Persist new record (expires: now + 7 days)
3. Mark old record as revoked with `revokedByIp` and `replacedByToken`
4. Set new token as HTTP-only cookie
5. Return new JWT

The 7-day window is an **inactivity timeout**, not a fixed session duration — it resets on every rotation.

---

## Section 3: Frontend

### `src/stores/auth.store.ts`

Remove `persist` from the entire store. Use `partialize` to persist only `user`:

```ts
persist((...), {
  name: 'auth-storage',
  partialize: (state) => ({ user: state.user }),
})
```

- `token` — in memory only (lost on reload, recovered via refresh token flow)
- `user` — persisted in localStorage (not sensitive, avoids UI flash on reload)

Add `clearAuth()` action for use by the interceptor on unrecoverable auth failure.

### `src/api/client.ts`

Add a **response interceptor**:

1. If response is `401` → call `POST /session/refresh-token`
2. On refresh success → save new JWT to store, retry original request
3. On refresh failure → call `clearAuth()`, navigate to `/login`

Handle concurrent `401`s: use a flag + promise queue so only **one** refresh call is made. Parallel requests that fail wait for the single refresh to resolve, then retry with the new token.

### `src/api/hooks/auth/useLogout.ts` — new

```
POST /session/logout
→ clear token from store
→ clear user from store
→ clear Apollo cache
→ navigate to /login
```

### `src/graphql/client.ts` — no changes

Apollo continues reading the token from `useAuthStore.getState().token`. The token is still in the store — it just no longer persists to localStorage.

---

## Section 4: Security & Error Handling

### Theft detection

If `POST /session/refresh-token` receives an already-revoked token:
1. Call `revokeAllForUser(userId)` — invalidates the entire token family
2. Return `401`

The legitimate user's next request will fail, forcing re-login and exposing the compromise.

### Error scenarios

| Scenario | Backend | Frontend |
|---|---|---|
| JWT expired | `401 EXPIRED_TOKEN` | Interceptor triggers refresh flow |
| JWT invalid | `401 INVALID_TOKEN` | Interceptor clears store → `/login` |
| Refresh token expired | `401` | "Session expired" → `/login` |
| Refresh token revoked | `401` + revoke family | "Session expired" → `/login` |
| Cookie absent | `401` | "Session expired" → `/login` |
| Logout with invalid cookie | `200` | Frontend clears store regardless |

### Deferred

| What | Why deferred |
|---|---|
| Cleanup job (BullMQ + Redis) | Revoked/expired tokens accumulate in DB until implemented. No data integrity impact. |
| JWT in HTTP-only cookie | JWT in memory already eliminates XSS exposure. Cookie approach is a future hardening step. |

---

## Flow Summary

```
Login:
  POST /session/login
  → validate credentials
  → generate JWT (15m) + refresh token (random bytes)
  → hash refresh token → store in DB
  → set HTTP-only cookie (raw token)
  → return { jwtToken, user }
  → frontend: store jwtToken in memory, user in localStorage

Authenticated request (JWT valid):
  Authorization: Bearer {JWT}
  → middleware verifies signature + expiry
  → req.user attached → controller runs → 200

Authenticated request (JWT expired):
  → 401 EXPIRED_TOKEN
  → Axios interceptor: POST /session/refresh-token (cookie sent automatically)
  → backend: hash cookie token → find in DB → validate → rotate
  → return { jwtToken }
  → interceptor: store new JWT → retry original request

Logout:
  POST /session/logout (cookie sent automatically)
  → backend: revoke refresh token in DB → clear cookie → 200
  → frontend: clear store → Apollo cache → navigate to /login

Session expired (refresh token invalid):
  POST /session/refresh-token → 401
  → interceptor: clear store → navigate to /login
```
