import { db } from '@config/db';
import { OperationType } from '@generated/prisma';

export const OperationRepository = {
  create: (data: {
    holdingId: number;
    type: OperationType;
    quantity: number;
    price: number;
    date: Date;
  }) =>
    db.operation.create({
      data: {
        holdingId: data.holdingId,
        type: data.type,
        quantity: data.quantity,
        price: data.price,
        fees: 0,
        date: data.date,
      },
    }),
};
