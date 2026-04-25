# Finvest API - Claude Rules

## About me

I'm a developer building a personal investment management app called **Finvest**.
I manage my own stock portfolio (equities, ETFs) and want a custom tool to track holdings,
operations, and performance. All amounts are in USD — including non-US stocks, which are
tracked via their ADR listings on US exchanges.

## Finvest — Project Overview

A full-stack personal finance app for managing stock investments.

## GitHub Access Restriction

Only interact with these two GitHub repositories via `gh` CLI or any GitHub tool:

- `miranda-daniel/Finvest-WEB`
- `miranda-daniel/Finvest-API`

Never access, clone, or interact with any other GitHub repository.

## Architecture

### Layer responsibilities

- **repositories/**: Only layer that imports `db`. One file per domain entity.
  All Prisma queries live here. No business logic.
- **services/**: Business logic only. Imports from repositories, never from `db` directly.
  Shared between REST controllers and GraphQL resolvers.
- **controllers/**: REST only (TSOA). Thin — call a service, return the result.
- **apollo/resolvers/**: GraphQL only. Thin — call a service, return the result.
- **clients/**: One file per external API. No business logic.

### REST vs GraphQL

- Use REST for: auth endpoints (login, register, logout, refresh token), calls to external
  APIs (e.g. fetching stock quotes from a market data provider), and anything consumed by
  non-GraphQL clients.
- Use GraphQL for: data fetching, flexible queries, and domain mutations (create, update,
  delete) that the frontend drives. GraphQL mutations are acceptable for domain operations —
  "side effects" in the REST rule refers to infrastructure-level effects like file uploads,
  email sends, or external API calls, not normal DB writes.

### Rules

- Always use arrow functions (`const foo = () => {}`) — never `function` declarations
- Services must not import `db` — use a repository.
- Controllers and resolvers must not import `db` or repositories — use a service.
- No serializer layer. REST response shape is defined by TSOA decorators.
  GraphQL response shape is defined by the schema.
- `clients/` is for external HTTP integrations only — not for internal modules.
- `helpers/` is for pure utility functions only — no side effects, no DB access, no service imports. One file per concern (e.g. `password.ts`, `date.ts`, `currency.ts`).

### Error handling

Never silence errors with empty catch blocks or by returning `null`/`undefined` when something went wrong. Errors must propagate so the caller knows what happened.

- **Services** — throw `ApiError` with a specific error code (`NOT_FOUND`, `UNAUTHENTICATED`, etc.). Never wrap repository calls in try/catch just to rethrow as `INTERNAL_SERVER_ERROR` — that masks the real error.
- **REST controllers** — let `ApiError` propagate naturally. The Express error handler in `postRoutesMiddleware` catches it and returns the correct HTTP response. No try/catch needed.
- **GraphQL resolvers** — catch `ApiError` explicitly and convert it to `GraphQLError` (Apollo does not understand `ApiError`). Re-throw anything else unchanged.

```ts
// ✅ Correct pattern in a GraphQL resolver
try {
  return await SomeService.doSomething(...);
} catch (err) {
  if (err instanceof ApiError) {
    throw new GraphQLError(err.message, {
      extensions: { code: 'NOT_FOUND', httpCode: err.httpCode },
    });
  }
  throw err;
}

// ❌ Never do this — silences the error
} catch (err) {
  return null;
}

// ❌ Never do this — masks the real error
} catch (err) {
  throw new ApiError(errors.INTERNAL_SERVER_ERROR);
}
```

### Types (`src/types/`)

One file per domain/feature, not one per database table.

- `user.ts` — user domain (request/response shapes)
- `session.ts` — login, tokens, auth
- `error.ts` — shared error types (e.g. `ErrorMessage`)
- Add new files as new domains are introduced (e.g. `stock.ts`, `portfolio.ts`, `transaction.ts`)

**What belongs in `types/`:** request/response shapes and domain types shared across layers.
**What does NOT belong:** types used by a single file (keep them inline), Prisma-generated types (`src/generated/prisma/`), config types (keep them in `config/` next to the file that uses them).

## Deferred improvements

These are intentionally not installed yet — they add complexity that isn't justified at the current scale. Add them when the trigger condition is met.

| What | When to add | Notes |
|---|---|---|
| `express-rate-limit` | Before going to production | Rate limit auth endpoints (`/session/login`, `/users`) by IP to prevent brute force. One middleware call per route — trivial to add. |
| `@prisma/extension-accelerate` or PgBouncer | When DB connections become a bottleneck | Prisma Accelerate adds connection pooling at the edge. Only relevant under real concurrent load — irrelevant with a single user. |
| Sentry | Before going to production | Error monitoring with stack traces, request context, and email alerts on new errors. Free tier (5k errors/month) is more than enough for personal use. Integration is ~3 lines with `@sentry/node`. |

## Diagrams

Architecture diagrams and flow charts are stored in `docs/architecture/`.
When adding new diagrams, place them there.

## Git workflow

Always work on a feature branch — never commit directly to `main`.

1. Create a branch from `main`: `git checkout -b feat/my-feature`
2. Commit your changes on that branch
3. Push the branch and open a Pull Request to `main`
4. CI must pass before merging

Branch naming follows the same types as commit messages: `feat/`, `fix/`, `refactor/`, `chore/`, etc.

## Commit messages

Follow the **Conventional Commits** spec. Format:

```
<type>(<optional scope>): <short description>
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither adds nor fixes anything |
| `chore` | Maintenance (deps, config, build tooling) |
| `docs` | Documentation only |
| `test` | Tests only |
| `perf` | Performance improvement |

**Rules:**
- Description in English, imperative mood ("add", not "added")
- Max ~72 characters on the first line
- No trailing period

**Examples:**
```
feat(portfolio): add portfolio creation endpoint
fix(auth): token not invalidated on logout
refactor(user): replace manual validation with Zod schema
chore: remove validator dependency
docs: add middleware flow diagram
test(session): add missing edge cases for expired token
```
