# Infrastructure Flow — Dev vs Prod

## Overview

Finvest uses different request routing strategies depending on the environment.
The goal is the same in both: the browser never makes direct cross-origin requests
to third parties (like FMP for stock logos), and all traffic flows through a single
controlled entry point.

---

## Development

```
Browser (localhost:5100)
    │
    ├── /logos/*    ──→  Vite proxy  ──→  https://financialmodelingprep.com/image-stock/*
    ├── /api/*      ──→  Vite proxy  ──→  http://localhost:3001/*  (Finvest-API, Node.js)
    ├── /posthog/*  ──→  Vite proxy  ──→  https://app.posthog.com/*
    ├── /sentry/*   ──→  Vite proxy  ──→  https://o<id>.ingest.sentry.io/*
    └── /*          ──→  Vite dev server  (React app with HMR)
```

**Components:**
- **Vite dev server** (`npm run dev`, port 5100): Serves the React app with hot module
  replacement. Also acts as a reverse proxy for `/api/*`, `/logos/*`, `/posthog/*`, and
  `/sentry/*` requests so the browser sees a single origin and avoids CORS/ORB issues.
- **Finvest-API** (Node.js, port 3001): Runs directly on the host machine or via
  `docker-compose.dev.yml`. Handles all business logic.
- **PostgreSQL**: Runs via Docker (`docker-compose.dev.yml`).

**What Vite does in dev:** Vite is a build tool with a built-in HTTP server. In
development it serves source files directly (no bundling step) and supports HMR —
saving a file instantly reflects in the browser without a full reload. The proxy
feature forwards specific paths to other servers, making the browser think everything
is on the same origin.

**What Vite does NOT do in prod:** Once you run `npm run build`, Vite compiles
all React/TypeScript into static files (`dist/`). After that, Vite has no runtime
role. The output is plain HTML, CSS, and JS — no Node.js process needed to serve them.

---

## Production

```
Internet (HTTPS)
    │
    ▼
AWS ALB  (port 443, SSL/TLS termination)
    │  forwards as plain HTTP
    ▼
nginx container  (port 80)
    │
    ├── /logos/*    ──→  https://financialmodelingprep.com/image-stock/*
    ├── /api/*      ──→  http://api:3001/*  (Finvest-API container, internal Docker DNS)
    ├── /posthog/*  ──→  https://app.posthog.com/*
    ├── /sentry/*   ──→  https://o<id>.ingest.sentry.io/*
    └── /*          ──→  dist/  (static files built by Vite, served by nginx)
```

**Components:**
- **AWS ALB**: Receives all public internet traffic. Handles HTTPS/SSL termination —
  meaning it decrypts TLS and forwards plain HTTP to nginx internally. Also provides
  load balancing if multiple instances are running.
- **nginx**: The internal entry point inside the Docker environment. Five jobs:
  1. Proxy `/logos/*` to FMP (avoids browser ORB blocks).
  2. Proxy `/api/*` to the Finvest-API container using Docker's internal DNS (`api`
     resolves to the API container automatically).
  3. Proxy `/posthog/*` to PostHog (avoids ad-blocker blocks).
  4. Proxy `/sentry/*` to Sentry ingest (avoids ad-blocker blocks).
  5. Serve the static `dist/` folder for all other requests (the React SPA).
- **Finvest-API container**: Same Node.js app as in dev, but running inside Docker.
  Not exposed publicly — only reachable internally via nginx.
- **PostgreSQL container**: Same as dev, internal only.

**Why ALB + nginx together?** They operate at different layers and complement each other:
- ALB handles cloud-level concerns: SSL, DNS, load balancing, health checks, AWS integration.
- nginx handles app-level concerns: static file serving, path-based routing, upstream proxying.
- ALB communicates with nginx over plain HTTP internally (port 80). SSL is terminated at
  the ALB boundary — nginx never needs to handle certificates.

---

## Key Differences

| Concern              | Dev                        | Prod                        |
|----------------------|----------------------------|-----------------------------|
| Entry point          | Vite dev server (:5100)    | ALB → nginx (:80)           |
| SSL/TLS              | None (localhost)           | ALB                         |
| React app served by  | Vite (source files + HMR)  | nginx (compiled `dist/`)    |
| `/api/*` proxy       | Vite proxy                 | nginx proxy                 |
| `/logos/*` proxy     | Vite proxy                 | nginx proxy                 |
| `/posthog/*` proxy   | Vite proxy                 | nginx proxy                 |
| `/sentry/*` proxy    | Vite proxy                 | nginx proxy                 |
| API process          | Host machine or Docker     | Docker container            |
| Hot reload           | Yes (Vite HMR)             | No                          |
