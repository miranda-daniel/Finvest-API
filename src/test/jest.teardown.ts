import { db } from '../config/db';

module.exports = async () => {
  const tables = ['User'];

  try {
    for (const table of tables) {
      await db.$executeRawUnsafe(`TRUNCATE "${table}" RESTART IDENTITY;`);
    }
  } finally {
    await db.$disconnect();
  }
};
