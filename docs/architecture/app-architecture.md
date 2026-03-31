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
             │  expressAuthentication │          │   buildApolloContext     │
             │  (per @Security('jwt'))│          │   reads Authorization   │
             │  validates JWT         │          │   header → user | null  │
             └────────────┬───────────┘          └────────────┬────────────┘
                          │                                   │
                          ▼                                   ▼
             ┌────────────────────────┐          ┌─────────────────────────┐
             │     CONTROLLERS        │          │       RESOLVERS          │
             │  (src/controllers/)    │          │  (src/graphql/resolvers/)│
             │                        │          │                          │
             │  Thin layer:           │          │  Thin layer:             │
             │  - parse request       │          │  - read context.user     │
             │  - call service        │          │  - throw if auth needed  │
             │  - return response     │          │  - call service          │
             └────────────┬───────────┘          └────────────┬────────────┘
                          │                                   │
                          └──────────────┬────────────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────┐
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
                          ┌──────────────────────────┐
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
                          ┌──────────────────────────┐
                          │     Prisma Client         │
                          │   (src/config/db.ts)      │
                          │   PrismaClient + PrismaPg │
                          └──────────────┬────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────┐
                          │      PostgreSQL           │
                          │   (Docker container)      │
                          └──────────────────────────┘
```

---

## Layer responsibilities

| Layer            | Location                 | Responsibility                                                                         |
| ---------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| **Controllers**  | `src/controllers/`       | REST only. Parse request, call service, return response. No business logic.            |
| **Resolvers**    | `src/graphql/resolvers/` | GraphQL only. Read context, check auth, call service. No business logic.               |
| **Services**     | `src/services/`          | Business logic. Shared between controllers and resolvers. Never imports `db` directly. |
| **Repositories** | `src/repositories/`      | Only layer that imports `db`. All Prisma queries live here. No business logic.         |
| **Clients**      | `src/clients/`           | External HTTP integrations (e.g. stock quote APIs).                                    |

---

## Authentication flow

### REST — `@Security('jwt')`

```
Request
  → TSOA generated routes.ts calls expressAuthentication()
  → Validates JWT from Authorization header
  → Throws ApiError if invalid/expired
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
| `src/graphql/apolloServer.ts`                  | Apollo Server factory + `buildApolloContext`.            |
| `src/routes/index.ts`                          | Manual Express router (healthcheck + Swagger UI).        |
| `src/routes/routes.ts`                         | TSOA generated — do not edit manually.                   |
| `prisma/schema.prisma`                         | Database schema.                                         |
| `src/generated/prisma/`                        | Prisma generated client — do not edit manually.          |
