import { OperationRepository } from '@repositories/operation-repository';
import { HoldingRepository } from '@repositories/holding-repository';
import { InstrumentRepository } from '@repositories/instrument-repository';
import { UserRepository } from '@repositories/user-repository';
import { db } from '@config/db';
import { hashPassword } from '@helpers/password';
import { OperationType } from '@generated/prisma';

const setup = async () => {
  const email = `op.repo.${Date.now()}@test.com`;
  const user = await UserRepository.create({
    email,
    password: await hashPassword('password123'),
    firstName: 'Op',
    lastName: 'Test',
  });
  const portfolio = await db.portfolio.create({ data: { name: 'Test', userId: user.id } });
  const cls = await db.instrumentClass.upsert({
    where: { name: 'Stock' },
    update: {},
    create: { name: 'Stock' },
  });
  const instrument = await InstrumentRepository.findOrCreate({
    symbol: `OPREPO${Date.now()}`,
    name: 'Op Repo Corp.',
    exchange: 'NYSE',
    instrumentClassId: cls.id,
  });
  const holding = await HoldingRepository.findOrCreate({
    portfolioId: portfolio.id,
    instrumentId: instrument.id,
  });
  return { holding };
};

describe('OperationRepository', () => {
  describe('create', () => {
    it('creates a BUY operation with correct fields', async () => {
      const { holding } = await setup();
      const date = new Date('2026-04-25');

      const op = await OperationRepository.create({
        holdingId: holding.id,
        type: OperationType.BUY,
        quantity: 5,
        price: 150.25,
        date,
      });

      expect(op.holdingId).toBe(holding.id);
      expect(op.type).toBe(OperationType.BUY);
      expect(Number(op.quantity)).toBe(5);
      expect(Number(op.price)).toBeCloseTo(150.25);
    });
  });
});
