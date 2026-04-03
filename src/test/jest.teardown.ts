// globalTeardown runs outside Jest's module resolver — path aliases and ts-jest
// transforms are not available here. We use pg directly to avoid the Prisma/alias
// import chain, which relies on moduleNameMapper not available in this context.
import { Client } from 'pg';

module.exports = async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();

  try {
    await client.query(
      `TRUNCATE "User", "Portfolio" RESTART IDENTITY CASCADE;`,
    );
  } finally {
    await client.end();
  }
};
