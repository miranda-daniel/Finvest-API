# Stage 1: Dependencies
FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci --engine-strict=false --ignore-scripts

# Stage 2: Builder
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.json tsoa.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY src ./src/

# Generate Prisma client (outputs to src/generated/prisma/)
RUN npx prisma generate

# Step 1: TSOA routes + TypeScript compilation
RUN npm run update-routes-and-swagger && npx tsc --outDir build

# Step 2: Copy Prisma-generated files into build/ before tsc-alias runs.
# tsc-alias only rewrites a path alias if the target directory already exists in outDir.
# Since Prisma generates .js/.d.ts files (not .ts source), tsc does not include them
# in build/ — so we copy manually here so tsc-alias can resolve @generated/*.
RUN cp -r src/generated build/

# Step 3: Resolve all path aliases (@config/*, @services/*, @generated/*, etc.)
RUN npx tsc-alias

# Stage 3: Runner
FROM node:24-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install only production dependencies (skip postinstall — prisma client copied from builder)
COPY package*.json .npmrc ./
RUN npm ci --engine-strict=false --omit=dev --ignore-scripts

# build/ already contains generated/prisma/ (copied in builder step 2 above)
COPY --from=builder /app/build ./build

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

CMD ["node", "build/index.js"]
