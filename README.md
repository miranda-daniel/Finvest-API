# Finvest API

Finvest backend. REST API (TSOA + Express) with a GraphQL layer (Apollo Server) and PostgreSQL via Prisma.

## Stack

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | 6 |
| Runtime | Node.js | 20.13 |
| Framework | Express | v5 |
| REST docs/routes | TSOA | v5 |
| GraphQL | Apollo Server | v3 |
| ORM | Prisma | v7 |
| Database | PostgreSQL | 13 |
| Validation | Zod | v4 |
| Logging | Winston | v3 |
| Testing | Jest | v30 |

## Getting started

### Prerequisites

- Node 20.13 / npm 10.5
- Docker (for the database)

### 1. Start the database

```bash
docker compose --env-file .env.development up -d
```

This starts a PostgreSQL container on port `5432`.

### 2. Run migrations

```bash
npx dotenv-cli -e .env.development -- npx prisma migrate dev
```

### 3. (Optional) Seed the database

```bash
npm run seed
```

### 4. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (via `postinstall`), which generates the Prisma client in `src/generated/prisma/`.

### 5. Start the server

```bash
npm start
```

The API runs at `http://localhost:3001`.

## Commands

```bash
# Start development server (with hot reload)
npm start

# Run tests
npm test

# Lint
npm run lint

# Lint and auto-fix
npm run lint-fix

# Format
npm run prettier-fix

# Regenerate TSOA routes and Swagger spec
npm run update-routes-and-swagger
```

## Endpoints

| Type | URL | Description |
|---|---|---|
| REST | `http://localhost:3001/` | REST API |
| REST docs | `http://localhost:3001/docs` | Swagger UI |
| GraphQL | `http://localhost:3001/graphql` | Apollo Server + Playground |

## Code Style

All code comments must be written in **English**.
