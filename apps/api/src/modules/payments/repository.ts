import type { Prisma } from '@prisma/client';
import type { PaymentOrderDto } from '@fwo/contracts';
import { paymentOrderSchema } from '@fwo/contracts';
import type { Tx } from '../../db.js';
import { assert } from '../../lib/errors.js';

export const orderInclude = {
  transaction: true,
  items: { include: { fulfillment: true }, orderBy: { id: 'asc' as const } },
} satisfies Prisma.PaymentOrderInclude;
export type StoredOrder = Prisma.PaymentOrderGetPayload<{
  include: typeof orderInclude;
}>;
export function orderDto(order: StoredOrder): PaymentOrderDto {
  const t = order.transaction!;
  return paymentOrderSchema.parse({
    id: order.id,
    orderCode: order.orderCode,
    productId: order.productId,
    productName: order.productName,
    totalAmount: order.totalAmount.toString(),
    currency: order.currency,
    quantity: order.quantity,
    status: order.status,
    method: t.method,
    gateway: t.gateway,
    transactionId: t.id,
    paymentStatus: t.status,
    paymentUrl: order.status === 'PENDING' ? t.paymentUrl : null,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.expiresAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    items: order.items.map((i) => ({
      id: i.id,
      itemId: i.itemId,
      name: i.name,
      kind: i.kind,
      quantity: i.quantity,
      imageKey: i.imageKey,
      inventoryId: i.fulfillment?.inventoryId ?? null,
    })),
  });
}
export class PaymentTransactionRepository {
  constructor(private db: Tx) {}
  async ownedOrder(id: string, userId: string) {
    const order = await this.db.paymentOrder.findFirst({
      where: { id, userId },
      include: orderInclude,
    });
    assert(
      order,
      404,
      'PAYMENT_ORDER_NOT_FOUND',
      'Không tìm thấy đơn thanh toán.',
    );
    return order;
  }
  async lockOrder(id: string) {
    await this.db
      .$queryRaw`SELECT id FROM payment_orders WHERE id = ${id}::uuid FOR UPDATE`;
    return this.db.paymentOrder.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });
  }
}
