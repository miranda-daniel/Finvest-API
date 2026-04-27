import { Decimal } from '@prisma/client-runtime-utils';
import { OperationType } from '@generated/prisma';

interface OperationLike {
  type: OperationType;
  quantity: Decimal;
  price: Decimal;
}

export interface HoldingMetrics {
  quantity: number;
  avgCost: number;
}

export const computeHoldingMetrics = (operations: OperationLike[]): HoldingMetrics => {
  const buyOps = operations.filter((op) => op.type === OperationType.BUY);
  const sellOps = operations.filter((op) => op.type === OperationType.SELL);

  const totalBuyQty = buyOps.reduce((sum, op) => sum + Number(op.quantity), 0);
  const totalSellQty = sellOps.reduce((sum, op) => sum + Number(op.quantity), 0);
  const quantity = totalBuyQty - totalSellQty;

  const totalBuyCost = buyOps.reduce((sum, op) => sum + Number(op.price) * Number(op.quantity), 0);
  const avgCost = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;

  return { quantity, avgCost };
};
