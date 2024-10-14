import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

module.exports = async () => {
  // Define the tables in sequential order to be deleted after ALL tests.
  const tables = ['User'];

  for (const table of tables) {
    await db.$executeRawUnsafe(`DELETE FROM "${table}";`);
  }

  await db.$disconnect();
};
