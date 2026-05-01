import { db } from '@config/db';

// Disconnect Prisma after all tests in each worker to avoid open handle warnings.
afterAll(async () => {
  await db.$disconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});
