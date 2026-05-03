import { PlatformType, OperationType, Prisma } from '../src/generated/prisma';
import { hashPassword } from '../src/helpers/password';
import { db } from '../src/config/db';

const seed = async () => {
  try {
    const hashedPassword = await hashPassword('Password1!');

    await db.$transaction(async (prisma: Prisma.TransactionClient) => {
      // Instrument classes
      const stockClass = await prisma.instrumentClass.upsert({
        where: { name: 'Stock' },
        update: {},
        create: { name: 'Stock' },
      });

      // Platform
      const platform = await prisma.platform.upsert({
        where: { name: 'Balanz' },
        update: {},
        create: { name: 'Balanz', type: PlatformType.BROKER },
      });

      // Instruments
      const [acn, nvo, tsm, ntes] = await Promise.all([
        prisma.instrument.upsert({
          where: { symbol: 'ACN' },
          update: {},
          create: {
            symbol: 'ACN',
            name: 'Accenture PLC',
            exchange: 'NYSE',
            country: 'IE',
            instrumentClassId: stockClass.id,
          },
        }),
        prisma.instrument.upsert({
          where: { symbol: 'NVO' },
          update: {},
          create: {
            symbol: 'NVO',
            name: 'Novo Nordisk A/S',
            exchange: 'NYSE',
            country: 'DK',
            instrumentClassId: stockClass.id,
          },
        }),
        prisma.instrument.upsert({
          where: { symbol: 'TSM' },
          update: {},
          create: {
            symbol: 'TSM',
            name: 'Taiwan Semiconductor Manufacturing',
            exchange: 'NYSE',
            country: 'TW',
            instrumentClassId: stockClass.id,
          },
        }),
        prisma.instrument.upsert({
          where: { symbol: 'NTES' },
          update: {},
          create: {
            symbol: 'NTES',
            name: 'NetEase Inc.',
            exchange: 'NASDAQ',
            country: 'CN',
            instrumentClassId: stockClass.id,
          },
        }),
      ]);

      // User
      const user = await prisma.user.upsert({
        where: { email: 'miranda.daniel.edu@gmail.com' },
        update: {},
        create: {
          email: 'miranda.daniel.edu@gmail.com',
          password: hashedPassword,
          firstName: 'Daniel',
          lastName: 'Miranda',
        },
      });

      // Portfolio
      const portfolio = await prisma.portfolio.create({
        data: {
          name: 'Balanz',
          userId: user.id,
        },
      });

      // Mark portfolio as favorite
      await prisma.user.update({
        where: { id: user.id },
        data: { favoritePortfolioId: portfolio.id },
      });

      // Holdings + operations
      // Prices are approximate values for February 2026
      const holdingsData: Array<{
        instrument: { id: number };
        buyQty: number;
        buyPrice: number;
        sellQty?: number;
        sellPrice?: number;
      }> = [
        { instrument: acn, buyQty: 10, buyPrice: 338.5 },
        { instrument: nvo, buyQty: 25, buyPrice: 83.2 },
        { instrument: tsm, buyQty: 15, buyPrice: 192.4 },
        { instrument: ntes, buyQty: 20, buyPrice: 91.6 },
      ];

      for (const h of holdingsData) {
        const holding = await prisma.holding.create({
          data: {
            portfolioId: portfolio.id,
            instrumentId: h.instrument.id,
            platformId: platform.id,
          },
        });

        await prisma.operation.create({
          data: {
            holdingId: holding.id,
            type: OperationType.BUY,
            quantity: h.buyQty,
            price: h.buyPrice,
            date: new Date('2026-02-02T14:30:00Z'),
          },
        });

        if (h.sellQty && h.sellPrice) {
          await prisma.operation.create({
            data: {
              holdingId: holding.id,
              type: OperationType.SELL,
              quantity: h.sellQty,
              price: h.sellPrice,
              date: new Date('2026-05-01T14:30:00Z'),
            },
          });
        }
      }
    });

    console.info('Seed complete.');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
};

seed();
