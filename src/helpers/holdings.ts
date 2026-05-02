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
  realizedPnl: number;
}

export const computeHoldingMetrics = (operations: OperationLike[]): HoldingMetrics => {
  // DIVIDEND and FEE operations are intentionally excluded: dividends are not reinvested
  // and fees are not capitalized into cost basis at this stage.
  const buyOps = operations.filter((op) => op.type === OperationType.BUY);
  const sellOps = operations.filter((op) => op.type === OperationType.SELL);

  const totalBuyQty = buyOps.reduce((sum, op) => sum + Number(op.quantity), 0);
  const totalSellQty = sellOps.reduce((sum, op) => sum + Number(op.quantity), 0);
  const quantity = totalBuyQty - totalSellQty;

  const totalBuyCost = buyOps.reduce((sum, op) => sum + Number(op.price) * Number(op.quantity), 0);
  const avgCost = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;

  // Realized P&L: for each sell, profit = (sell price - avg cost at time of sell) × qty.
  // Uses the global avgCost across all buys as the cost basis for sells (FIFO approximation).
  const realizedPnl = sellOps.reduce(
    (sum, op) => sum + (Number(op.price) - avgCost) * Number(op.quantity),
    0,
  );

  return { quantity: Math.max(0, quantity), avgCost, realizedPnl };
};
