// globalSetup runs in a separate worker outside Jest's module transform pipeline.
// ts-jest's moduleNameMapper and ES module transforms are NOT available here —
// only CommonJS require() and bare npm imports work. Do not convert to ESM syntax.
//
// Ensures the test database exists and is up to date before any test runs.
// This makes `npm test` safe to run after `docker compose down -v`.
import { Client } from 'pg';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

module.exports = async () => {
  dotenv.config({
    path: path.resolve(__dirname, '../../../.env.test'),
    override: true,
  });

  const databaseUrl = process.env.DATABASE_URL!;
  const dbName = new URL(databaseUrl).pathname.slice(1);

  // Connect to the default 'postgres' database to check/create the test DB
  const adminUrl = databaseUrl.replace(`/${dbName}`, '/postgres');
  const client = new Client({ connectionString: adminUrl });

  await client.connect();

  try {
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
};
