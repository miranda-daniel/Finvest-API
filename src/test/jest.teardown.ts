import { db } from '../../prisma/db';

module.exports = async () => {
  // Define the tables in sequential order to be deleted after ALL tests.
  const tables = ['User'];

  for (const table of tables) {
    await db.$executeRawUnsafe(`DELETE FROM "${table}";`);
  }

  await db.$disconnect();
};
