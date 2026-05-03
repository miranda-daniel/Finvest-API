import { Prisma } from '../src/generated/prisma';
import { db } from '../src/config/db';

// Deletes all user portfolio data (operations, holdings, portfolios) and non-benchmark
// instruments, leaving the user account and benchmark data (SPY, QQQ) intact.
const clear = async () => {
  try {
    await db.$transaction(async (prisma: Prisma.TransactionClient) => {
      await prisma.operation.deleteMany({});
      await prisma.holding.deleteMany({});
      await prisma.portfolio.deleteMany({});
      await prisma.instrument.deleteMany({ where: { isBenchmark: false } });
    });

    console.info('Clear complete. User account and benchmark data (SPY, QQQ) preserved.');
  } catch (error) {
    console.error('Clear error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
};

clear();
