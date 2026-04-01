import { PrismaClient } from '@generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV_VARIABLES } from '@config/config';

const adapter = new PrismaPg({
  connectionString: ENV_VARIABLES.databaseURL,
});

export const db = new PrismaClient({ adapter });
