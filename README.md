# Finvest API

Finvest backend. REST API (TSOA + Express) with a GraphQL layer (Apollo Server) and PostgreSQL via Prisma.

## Stack

| Layer            | Technology    | Version |
| ---------------- | ------------- | ------- |
| Language         | TypeScript    | 6       |
| Runtime          | Node.js       | 20.13   |
| Framework        | Express       | v5      |
| REST docs/routes | TSOA          | v5      |
| GraphQL          | Apollo Server | v5      |
| ORM              | Prisma        | v7      |
| Database         | PostgreSQL    | 13      |
| Validation       | Zod           | v4      |
| Logging          | Winston       | v3      |
| Testing          | Jest          | v30     |

## Getting started

### Prerequisites

- Node 20.13 / npm 10.5
- Docker

---

### Option A — Docker development (recommended)

Uses `docker-compose.dev.yml` + `Dockerfile.dev`. The API runs with `nodemon` inside the container and watches `./src` via a volume mount — code changes reload automatically without rebuilding the image.

```bash
# First run, or after changing package.json / prisma schema / tsconfig
npm run dev:build

# Normal workflow — just start, edits reload automatically
npm run dev
```

**When `--build` is required:**

| Change                               | Rebuild needed          |
| ------------------------------------ | ----------------------- |
| Edit `src/` files                    | No — nodemon handles it |
| Add/remove npm dependency            | Yes                     |
| Change Prisma schema                 | Yes                     |
| Change `tsconfig.json` / `tsoa.json` | Yes                     |

The DB becomes healthy first; the API waits and starts automatically after.

---

### Option B — Local development

#### 1. Start the database only

```bash
docker compose --env-file .env.development up -d db
```

This starts a PostgreSQL container on port `5432`.

#### 2. Run migrations

```bash
npx dotenv-cli -e .env.development -- npx prisma migrate dev
```

#### 3. (Optional) Seed the database

```bash
npm run seed
```

#### 4. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (via `postinstall`), which generates the Prisma client in `src/generated/prisma/`.

#### 5. Start the server

```bash
npm start
```

The API runs at `http://localhost:3001`.

## Commands

```bash
# Start Docker dev stack (hot reload, no rebuild on code changes)
npm run dev

# Start Docker dev stack and rebuild image
npm run dev:build

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

| Type      | URL                             | Description                      |
| --------- | ------------------------------- | -------------------------------- |
| REST      | `http://localhost:3001/`        | REST API                         |
| REST docs | `http://localhost:3001/docs`    | Swagger UI (endpoints)           |
| GraphQL   | `http://localhost:3001/graphql` | GraphQL endpoint + Sandbox (dev) |
