# Finvest API - Claude Rules

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