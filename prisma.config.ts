/// <reference types="node" />
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// DATABASE_URL is not required for `prisma generate` (no DB connection needed)
// It is required at runtime and for migrations
export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(process.env.DATABASE_URL && {
    datasource: {
      url: process.env.DATABASE_URL,
    },
  }),
});
