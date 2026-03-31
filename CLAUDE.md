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
- **graphql/resolvers/**: GraphQL only. Thin — call a service, return the result.
- **clients/**: One file per external API. No business logic.

### REST vs GraphQL

- Use REST for: auth endpoints, mutations with side effects (file upload, email send),
  anything consumed by non-GraphQL clients.
- Use GraphQL for: data fetching, flexible queries, anything the frontend queries
  for display purposes.

### Rules

- Services must not import `db` — use a repository.
- Controllers and resolvers must not import `db` or repositories — use a service.
- No serializer layer. REST response shape is defined by TSOA decorators.
  GraphQL response shape is defined by the schema.
- `clients/` is for external HTTP integrations only — not for internal modules.

### Types (`src/types/`)

One file per domain/feature, not one per database table.

- `user.ts` — user domain (request/response shapes)
- `session.ts` — login, tokens, auth
- `error.ts` — shared error types (e.g. `ErrorMessage`)
- Add new files as new domains are introduced (e.g. `stock.ts`, `portfolio.ts`, `transaction.ts`)

**What belongs in `types/`:** request/response shapes and domain types shared across layers.
**What does NOT belong:** types used by a single file (keep them inline), Prisma-generated types (`src/generated/prisma/`), config types (keep them in `config/` next to the file that uses them).

## Diagrams

Architecture diagrams and flow charts are stored in `docs/architecture/`.
When adding new diagrams, place them there.
