# Finvest API — Architecture Diagram

## Request flow overview

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                     CLIENT (Frontend)                   │
                        └────────────────────┬────────────────────────────────────┘
                                             │ HTTP
                          ┌──────────────────┴─────────────────┐
                          │                                     │
                   REST request                          GraphQL request
                          │                                     │
                          ▼                                     ▼
             ┌────────────────────────┐          ┌─────────────────────────┐
             │   Express Router       │          │   Apollo Server         │
             │   (TSOA generated)     │          │   POST /graphql         │
             │   /users, /sessions... │          │                         │
             └────────────┬───────────┘          └────────────┬────────────┘
                          │                                   │
                          │                                   │
             ┌────────────▼───────────┐          ┌────────────▼────────────┐
             │  expressAuthentication │          │   buildApolloContext    │
             │  (per @Security('jwt'))│          │   reads Authorization   │
             │  validates JWT         │          │   header → user | null  │
             └────────────┬───────────┘          └────────────┬────────────┘
                          │                                   │
                          ▼                                   ▼
             ┌────────────────────────┐          ┌──────────────────────────┐
             │     CONTROLLERS        │          │       RESOLVERS          │
             │  (src/controllers/)    │          │  (src/apollo/resolvers/) │
             │                        │          │                          │
             │  Thin layer:           │          │  Thin layer:             │
             │  - parse request       │          │  - read context.user     │
             │  - call service        │          │  - throw if auth needed  │
             │  - return response     │          │  - call service          │
             └────────────┬───────────┘          └────────────┬─────────────┘
                          │                                   │
                          └──────────────┬────────────────────┘
                                         │
                                         ▼
                          ┌───────────────────────────┐
                          │        SERVICES           │
                          │    (src/services/)        │
                          │                           │
                          │  Business logic only.     │
                          │  Shared between REST      │
                          │  and GraphQL.             │
                          │                           |
                          |  example:                 │
                          │  user-services.ts         │
                          └──────────────┬────────────┘
                                         │
                                         ▼
                          ┌───────────────────────────┐
                          │      REPOSITORIES         │
                          │   (src/repositories/)     │
                          │                           │
                          │  Only layer that touches  │
                          │  the database.            │
                          │  All Prisma queries here. │
                          │                           |
                          |  example:                 │
                          │  user-repository.ts       │
                          └──────────────┬────────────┘
                                         │
                                         ▼
                          ┌───────────────────────────┐
                          │     Prisma Client         │
                          │   (src/config/db.ts)      │
                          │   PrismaClient + PrismaPg │
                          └──────────────┬────────────┘
                                         │
                                         ▼
                          ┌───────────────────────────┐
                          │      PostgreSQL           │
                          │   (Docker container)      │
                          └───────────────────────────┘
```

---

## Layer responsibilities

| Layer            | Location                | Responsibility                                                                         |
| ---------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| **Controllers**  | `src/controllers/`      | REST only. Parse request, call service, return response. No business logic.            |
| **Resolvers**    | `src/apollo/resolvers/` | GraphQL only. Read context, check auth, call service. No business logic.               |
| **Services**     | `src/services/`         | Business logic. Shared between controllers and resolvers. Never imports `db` directly. |
| **Repositories** | `src/repositories/`     | Only layer that imports `db`. All Prisma queries live here. No business logic.         |
| **Clients**      | `src/clients/`          | External HTTP integrations (e.g. stock quote APIs).                                    |

---

## Authentication flow

Dual-token strategy: short-lived JWT (15m) in memory + long-lived refresh token (7d) in HTTP-only cookie.
See [`auth-refresh-token-flow.md`](auth-refresh-token-flow.md) for the full flow diagrams.

### REST — `@Security('jwt')`

```
Request
  → TSOA generated routes.ts calls expressAuthentication()
  → Validates JWT from Authorization header
  → Throws ApiError(EXPIRED_TOKEN) if expired → frontend interceptor renews JWT silently
  → Throws ApiError(INVALID_TOKEN) if invalid
  → Returns TokenPayload — available as request.user in controller
```

### GraphQL — `buildApolloContext`

```
Request
  → buildApolloContext() reads Authorization header
  → If no token → context.user = null  (public resolvers work normally)
  → If valid token → context.user = { userId }
  → If invalid/expired token → throws GraphQLError (UNAUTHENTICATED)
  → Resolver decides whether to require context.user
```

### Session endpoints (no JWT required)

```
POST /session/login        → validate credentials, issue JWT + set refresh token cookie
POST /session/refresh-token → read cookie, rotate refresh token, return new JWT
POST /session/logout        → revoke refresh token in DB, clear cookie
```

---

## Startup sequence (`src/index.ts`)

```
1. express() — create app instance
2. preRoutesMiddleware(app) — helmet, cors, morgan, express.json
3. app.use('/', router) — healthcheck GET / and Swagger UI GET /docs
4. createApolloServer().start() — init Apollo
5. app.use('/graphql', expressMiddleware) — mount GraphQL
6. RegisterRoutes(app) — mount TSOA REST routes
7. postRoutesMiddleware(app) — global error handler
8. app.use(...) — 404 handler
9. app.listen(3001)
```

> Apollo must be mounted before TSOA routes to prevent TSOA from overwriting /graphql.

---

## Key files

| File                                           | Purpose                                                  |
| ---------------------------------------------- | -------------------------------------------------------- |
| `src/index.ts`                                 | Entry point. Express + Apollo setup and startup.         |
| `src/config/db.ts`                             | Prisma client singleton.                                 |
| `src/config/config.ts`                         | Environment variables (PORT, JWT secret, etc).           |
| `src/config/environments.ts`                   | `isDevelopment()`, `isProduction()`, `isTest()` helpers. |
| `src/config/errors.ts`                         | Centralized error definitions.                           |
| `src/middlewares/authentication-middleware.ts` | TSOA JWT validation for REST.                            |
| `src/helpers/token.ts`                         | Pure utils: generate refresh token, hash (SHA-256), expiry. |
| `src/apollo/apolloServer.ts`                   | Apollo Server factory + `buildApolloContext`.            |
| `src/routes/index.ts`                          | Manual Express router (healthcheck + Swagger UI).        |
| `src/routes/routes.ts`                         | TSOA generated — do not edit manually.                   |
| `prisma/schema.prisma`                         | Database schema.                                         |
| `src/generated/prisma/`                        | Prisma generated client — do not edit manually.          |
