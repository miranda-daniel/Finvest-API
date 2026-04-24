import { faker } from '@faker-js/faker';
import { Prisma } from '../src/generated/prisma';
import { hashPassword } from '../src/helpers/password';
import { db } from '../src/config/db';

faker.seed(1);
const DEFAULT_PASSWORD = 'Password1!';
const DEFAULT_USERS_AMOUNT = 5;

const seed = async () => {
  try {
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

    await db.$transaction(async (prisma: Prisma.TransactionClient) => {
      for (let i = 0; i < DEFAULT_USERS_AMOUNT; i++) {
        const email = faker.internet.email();

        await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            password: hashedPassword,
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
          },
        });
      }
    });

    console.info('users created!');
  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await db.$disconnect();
  }
};

seed();
