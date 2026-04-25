// globalTeardown runs in a separate worker outside Jest's module transform pipeline.
// ts-jest's moduleNameMapper (path aliases like @config/, @services/) and ES module
// transforms are NOT available here — only CommonJS require() and bare npm imports work.
//
// This is why this file uses `module.exports` instead of `export default`, and imports
// 'pg' directly instead of going through Prisma or any path alias. Do not convert this
// to ESM syntax — it will break at runtime.
import { Client } from 'pg';

module.exports = async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();

  try {
    await client.query(`TRUNCATE "User", "Portfolio", "RefreshToken" RESTART IDENTITY CASCADE;`);
  } finally {
    await client.end();
  }
};
