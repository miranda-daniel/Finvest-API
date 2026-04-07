# Auth Flow — JWT + Refresh Token

## Token strategy

| Token | Duration | Storage | Purpose |
|---|---|---|---|
| JWT (access token) | 15 min | Memory (Zustand) | Authenticate every request |
| Refresh token | 7 days sliding | HTTP-only cookie + DB (hashed) | Renew the JWT silently |

The 7-day window is an **inactivity timeout** — it resets on every use. A user active daily never gets logged out.

---

## Flow 1 — Login

```
User submits credentials
        │
        ▼
POST /session/login
        │
        ├─ validate credentials
        ├─ sign JWT (15m)
        ├─ generate raw refresh token (crypto.randomBytes)
        ├─ hash token (SHA-256) → store in DB
        └─ set HTTP-only cookie (raw token)
        │
        ▼
Response: { jwtToken, user }
        │
        ▼
Frontend (useLogin)
        ├─ store jwtToken → Zustand memory only
        └─ store user    → Zustand + localStorage (not sensitive)
```

---

## Flow 2 — Authenticated request (JWT valid)

```
Frontend request
Authorization: Bearer <JWT>
        │
        ▼
expressAuthentication middleware
        ├─ verify JWT signature ✅
        ├─ check expiration    ✅
        └─ attach user to req.user
        │
        ▼
Controller → Service → Repository
        │
        ▼
200 OK
```

---

## Flow 3 — JWT expired (the main refresh flow)

```
Frontend request
Authorization: Bearer <expired JWT>
        │
        ▼
expressAuthentication middleware
        └─ TokenExpiredError → 401 EXPIRED_TOKEN
        │
        ▼
Axios response interceptor (response.interceptor.ts)
        │
        ├─ Is this a 401? ────────────── No → reject normally
        ├─ Already retried? ──────────── Yes → reject normally
        └─ Is this /refresh-token? ───── Yes → reject normally (prevents loop)
        │
        ▼ (first 401, proceed)
        │
        ├─ Other requests also 401ing concurrently?
        │       └─ Yes → pushed to failedQueue, wait for refresh to resolve
        │
        ▼
isRefreshing = true

POST /session/refresh-token
(browser sends HTTP-only cookie automatically)
        │
        ▼
Backend (SessionService.refreshToken)
        │
        ├─ read raw token from cookie
        ├─ hash it (SHA-256)
        ├─ find in DB by hash
        │
        ├─ not found? ──────────────────── → 401 (go to Flow 4b)
        ├─ already revoked? ────────────── → revokeAllForUser + 401 (theft detected)
        ├─ expired? ────────────────────── → 401 (go to Flow 4b)
        │
        └─ valid → ROTATE:
                ├─ generate new raw token
                ├─ hash new token → store in DB (expires: now + 7d)
                ├─ mark old token as revoked (replacedByToken = new hash)
                ├─ set new HTTP-only cookie
                └─ return { jwtToken }
        │
        ▼
Interceptor receives { jwtToken }
        │
        ├─ setToken(jwtToken) → Zustand memory
        ├─ processQueue(token) → all queued requests retry with new JWT
        └─ retry original request with new JWT
        │
        ▼
200 OK — user sees nothing, flow was transparent
```

---

## Flow 4a — Page reload (token lost from memory)

```
User reloads page
        │
        ▼
TanStack Router: beforeLoad() in _authenticated.tsx
        │
        ├─ store.token === null? (memory cleared on reload)
        │
        ▼ Yes
POST /session/refresh-token
(HTTP-only cookie sent automatically)
        │
        ├─ Success → setToken(jwtToken) → render protected route
        └─ Failure → redirect to /login
```

---

## Flow 4b — Refresh token expired or invalid

```
POST /session/refresh-token → 401
        │
        ▼
Interceptor catch block
        │
        ├─ processQueue(error) → all queued requests reject
        ├─ clearAuth() → clear token + user from Zustand
        └─ window.location.href = '/login'
        │
        ▼
User sees login screen
```

---

## Flow 5 — Logout

```
User clicks "Sign out"
        │
        ▼
useLogout → POST /session/logout
(HTTP-only cookie sent automatically)
        │
        ▼
Backend (SessionService.logoutUser)
        ├─ find token in DB by hash
        ├─ mark as revoked
        └─ clear cookie (Max-Age=0)
        │
        ▼
Frontend (onSettled — runs regardless of server response)
        ├─ clearAuth() → clear token + user from Zustand
        ├─ apolloClient.clearStore()
        └─ navigate to /login
```

---

## Theft detection

If a refresh token that was already rotated gets used again (e.g. attacker intercepted the old one):

```
Attacker uses old (revoked) refresh token
        │
        ▼
Backend: token found in DB, but revoked = true
        │
        ▼
revokeAllForUser(userId)
→ ALL tokens for this user are revoked
→ 401 returned
        │
        ▼
Legitimate user's next request also fails
→ forced to re-login
→ compromise revealed
```

---

## Token storage summary

| What | Where | Why |
|---|---|---|
| JWT | Zustand memory only | Not accessible to XSS |
| User (id, email, name) | Zustand + localStorage | Not sensitive; prevents UI flash on reload |
| Refresh token (raw) | HTTP-only cookie | Not accessible to JS at all |
| Refresh token (hash) | PostgreSQL `RefreshToken` table | Enables revocation and audit trail |

---

## Deferred improvements

| What | When |
|---|---|
| Nightly cleanup job (BullMQ + Redis) | Before going to production — purges revoked/expired tokens from DB |
| Rate limiting on `/session/login` | Before going to production — prevents brute force |
