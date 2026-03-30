# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci --engine-strict=false

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY tsconfig.json tsoa.json ./
COPY prisma ./prisma/
COPY src ./src/

# Generate Prisma client (DATABASE_URL required by prisma generate even if unused at build time)
RUN DATABASE_URL=postgresql://placeholder npx prisma generate

# Compile: TSOA routes + tsc + resolve path aliases
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install only production dependencies
COPY package*.json .npmrc ./
RUN npm ci --engine-strict=false --omit=dev

# Copy compiled output and generated Prisma client
COPY --from=builder /app/build ./build
COPY --from=builder /app/src/generated ./src/generated

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

CMD ["node", "build/index.js"]
