import { createHash, randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  paymentProductInputSchema,
  diamondCurrencyItemId,
  paymentOrderInputSchema,
  paymentListQuerySchema,
} from '@fwo/contracts';
import type {
  PaymentCatalogDto,
  PaymentMethod,
  PaymentEvent,
} from '@fwo/contracts';
import type { Context } from '../../types.js';
import type { Tx } from '../../db.js';
import { json } from '../../db.js';
import { ApiError, assert } from '../../lib/errors.js';
import { event, lockPlayer, mutation } from '../../lib/transaction.js';
import { diamondLedger } from '../characters/service.js';
import { getPlayer, grantItem, runtimeConfig } from '../players/service.js';
import { createGateways } from './gateways.js';
import type {
  GatewayOrder,
  GatewayName,
  GatewayFetch,
  PaymentGatewayInterface,
  VerifiedPayment,
} from './gateways.js';
import type { PaymentConfig } from './config.js';
import { enabledPaymentMethods } from './config.js';
import {
  PaymentTransactionRepository,
  orderDto,
  orderInclude,
} from './repository.js';
import type { StoredOrder } from './repository.js';

export type PaymentPublisher = (
  userId: string,
  event: PaymentEvent,
) => Promise<void>;
const safeCode = (error: unknown) =>
  error instanceof ApiError ? error.code : 'PAYMENT_RETRY_REQUIRED';
const safePayload = (payload: unknown) => {
  const allowed = [
    'orderId',
    'requestId',
    'amount',
    'transId',
    'resultCode',
    'responseTime',
    'partnerCode',
    'vnp_TxnRef',
    'vnp_Amount',
    'vnp_TransactionNo',
    'vnp_ResponseCode',
    'vnp_TransactionStatus',
    'vnp_PayDate',
    'vnp_BankCode',
    'vnp_TmnCode',
  ];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return {};
  return Object.fromEntries(
    Object.entries(payload)
      .filter(
        ([k, v]) =>
          allowed.includes(k) &&
          (typeof v === 'string' || typeof v === 'number'),
      )
      .map(([k, v]) => [k, String(v).slice(0, 120)]),
  );
};

export class OrderService {
  constructor(
    private ctx: Context,
    private config: PaymentConfig,
    private gateways: Map<PaymentMethod, PaymentGatewayInterface>,
  ) {}
  async resolveItems(tx: Tx, raw: unknown) {
    const lines = paymentProductInputSchema.shape.items.parse(raw);
    const config = (await runtimeConfig(tx)).value;
    const resolved = [];
    for (const line of lines) {
      if (line.kind === 'DIAMOND') {
        assert(
          line.itemId === diamondCurrencyItemId,
          422,
          'INVALID_CURRENCY_DEFINITION',
        );
        resolved.push({
          ...line,
          name: 'Kim cương',
          imageKey: 'diamonds',
          minLevel: 1,
        });
        continue;
      }
      const item =
        line.kind === 'BAIT'
          ? config.baits.find((i) => i.id === line.itemId)
          : config.equipment.find(
              (i) => i.id === line.itemId && i.kind === line.kind,
            );
      assert(
        item,
        422,
        'PAYMENT_PRODUCT_ITEM_UNAVAILABLE',
        'Vật phẩm trong gói chưa sẵn sàng.',
      );
      const active =
        line.kind === 'BAIT'
          ? await tx.baitType.findFirst({
              where: { id: line.itemId, active: true },
            })
          : await tx.equipment.findFirst({
              where: { id: line.itemId, active: true },
            });
      assert(active, 422, 'PAYMENT_PRODUCT_ITEM_UNAVAILABLE');
      resolved.push({
        ...line,
        name: item.name,
        imageKey: item.imageKey,
        minLevel: item.minLevel,
      });
    }
    return resolved;
  }
  async catalog(userId: string): Promise<PaymentCatalogDto> {
    const methods = enabledPaymentMethods(this.config);
    const products = await this.ctx.db.paymentProduct.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    const level = (await getPlayer(this.ctx.db, userId)).level;
    const items = [];
    for (const p of products) {
      try {
        const lines = await this.resolveItems(this.ctx.db, p.items);
        if (lines.some((i) => i.minLevel > level)) continue;
        items.push({
          id: p.id,
          name: p.name,
          description: p.description,
          amountVnd: p.amountVnd.toString(),
          version: p.version,
          maxQuantity: lines.some((i) => !['BAIT', 'DIAMOND'].includes(i.kind))
            ? 1
            : Math.min(100, Number(999999999n / p.amountVnd)),
          items: lines.map(({ minLevel: _min, ...i }) => i),
        });
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
      }
    }
    return { environment: this.config.environment, methods, items };
  }
  async create(request: FastifyRequest) {
    const input = paymentOrderInputSchema.parse(request.body);
    const gateway = this.gateways.get(input.method);
    assert(
      gateway,
      503,
      'PAYMENT_METHOD_DISABLED',
      'Phương thức thanh toán chưa được cấu hình.',
    );
    const result = await mutation(
      this.ctx,
      request,
      '/payments/orders',
      async (tx, userId, key) => {
        await tx.$queryRaw`SELECT id FROM payment_products WHERE id = ${input.productId}::uuid FOR SHARE`;
        const product = await tx.paymentProduct.findFirst({
          where: { id: input.productId, active: true },
        });
        assert(product, 404, 'PAYMENT_PRODUCT_NOT_FOUND');
        const items = await this.resolveItems(tx, product.items);
        const level = (await getPlayer(tx, userId)).level;
        assert(
          items.every((i) => i.minLevel <= level),
          422,
          'LEVEL_REQUIRED',
        );
        assert(
          input.quantity === 1 ||
            items.every((i) => ['BAIT', 'DIAMOND'].includes(i.kind)),
          422,
          'EQUIPMENT_QUANTITY_LIMIT',
        );
        const amount = product.amountVnd * BigInt(input.quantity);
        assert(
          amount >= 1000n && amount <= 999999999n,
          422,
          'PAYMENT_AMOUNT_LIMIT',
        );
        const id = randomUUID(),
          at = new Date(this.ctx.now());
        const order = await tx.paymentOrder.create({
          data: {
            id,
            userId,
            productId: product.id,
            orderCode: `FW${id.replaceAll('-', '')}`,
            productName: product.name,
            totalAmount: amount,
            quantity: input.quantity,
            idempotencyKey: key,
            createdAt: at,
            expiresAt: new Date(at.getTime() + 15 * 60000),
            items: {
              create: items.map((i) => ({
                itemId: i.itemId,
                name: i.name,
                kind: i.kind,
                quantity: i.quantity * input.quantity,
                imageKey: i.imageKey,
              })),
            },
            transaction: {
              create: { gateway: gateway.name, method: input.method, amount },
            },
          },
          include: orderInclude,
        });
        await enqueueNotification(
          tx,
          order,
          'payment:pending',
          `pending:${id}`,
          this.ctx.now(),
        );
        return { orderId: id };
      },
    );
    return result.orderId;
  }
}

export async function enqueueNotification(
  tx: Tx,
  order: StoredOrder,
  name: PaymentEvent['event'],
  key: string,
  at: number,
) {
  const id = randomUUID();
  await tx.paymentOutbox.upsert({
    where: { key },
    update: {},
    create: {
      id,
      orderId: order.id,
      userId: order.userId,
      key,
      type: 'NOTIFICATION',
      payload: json({ id, event: name, data: orderDto(order) }),
      availableAt: new Date(at),
    },
  });
}

export class PaymentService {
  readonly gateways: Map<PaymentMethod, PaymentGatewayInterface>;
  readonly orders: OrderService;
  private publisher: PaymentPublisher = async () => {};
  constructor(
    readonly ctx: Context,
    readonly config: PaymentConfig,
    fetcher?: GatewayFetch,
    private beforeGrant?: () => Promise<void>,
  ) {
    this.gateways = createGateways(config, fetcher);
    this.orders = new OrderService(ctx, config, this.gateways);
  }
  setPublisher(publisher: PaymentPublisher) {
    this.publisher = publisher;
  }
  private gateway(method: string) {
    const gateway = this.gateways.get(method as PaymentMethod);
    assert(gateway, 503, 'PAYMENT_METHOD_DISABLED');
    return gateway;
  }
  private gatewayOrder(order: StoredOrder, ip: string): GatewayOrder {
    return {
      orderCode: order.orderCode,
      transactionId: order.transaction!.id,
      amount: order.totalAmount,
      method: order.transaction!.method as PaymentMethod,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      ip,
    };
  }
  async checkout(id: string, userId: string, ip: string) {
    await this.expire(id);
    const order = await new PaymentTransactionRepository(
      this.ctx.db,
    ).ownedOrder(id, userId);
    assert(
      order.status === 'PENDING',
      409,
      'PAYMENT_ORDER_NOT_PENDING',
      'Đơn hàng không còn chờ thanh toán.',
    );
    if (order.transaction!.paymentUrl) return orderDto(order);
    const gateway = this.gateway(order.transaction!.method);
    const at = new Date(this.ctx.now());
    const claim = await this.ctx.db.paymentTransaction.updateMany({
      where: {
        id: order.transaction!.id,
        status: 'PENDING',
        paymentUrl: null,
        OR: [
          { checkoutLeaseAt: null },
          { checkoutLeaseAt: { lt: new Date(at.getTime() - 30000) } },
        ],
      },
      data: { checkoutLeaseAt: at },
    });
    if (!claim.count)
      throw new ApiError(
        409,
        'CHECKOUT_IN_PROGRESS',
        'Đang tạo trang thanh toán. Vui lòng kiểm tra lại đơn hàng.',
      );
    try {
      const paymentUrl = await gateway.createCheckout(
        this.gatewayOrder(order, ip),
      );
      await this.ctx.db.paymentTransaction.updateMany({
        where: {
          id: order.transaction!.id,
          status: 'PENDING',
          checkoutLeaseAt: at,
        },
        data: { paymentUrl, checkoutLeaseAt: null },
      });
    } finally {
      await this.ctx.db.paymentTransaction.updateMany({
        where: { id: order.transaction!.id, checkoutLeaseAt: at },
        data: { checkoutLeaseAt: null },
      });
    }
    return orderDto(
      await new PaymentTransactionRepository(this.ctx.db).ownedOrder(
        id,
        userId,
      ),
    );
  }
  async webhook(gatewayName: GatewayName, payload: unknown) {
    const gateway = this.gateway(gatewayName);
    const hashed = createHash('sha256')
      .update(JSON.stringify(payload ?? null))
      .digest('hex');
    let verified: VerifiedPayment;
    try {
      verified = gateway.verifyWebhook(payload);
    } catch (error) {
      await this.ctx.db.paymentWebhookLog.create({
        data: {
          gateway: gatewayName,
          payload: json(safePayload(payload)),
          payloadHash: hashed,
          signatureValid: false,
          orderCode:
            typeof safePayload(payload).vnp_TxnRef === 'string' &&
            /^FW[a-f0-9]{32}$/.test(safePayload(payload).vnp_TxnRef!)
              ? safePayload(payload).vnp_TxnRef
              : typeof safePayload(payload).orderId === 'string' &&
                  /^FW[a-f0-9]{32}$/.test(safePayload(payload).orderId!)
                ? safePayload(payload).orderId
                : null,
          processingStatus: 'REJECTED_SIGNATURE_OR_PAYLOAD',
        },
      });
      throw error;
    }
    try {
      const result = await this.accept(gatewayName, verified, {
        hash: hashed,
        payload: safePayload(payload),
      });
      await this.drain();
      return result;
    } catch (error) {
      await this.ctx.db.paymentWebhookLog.create({
        data: {
          gateway: gatewayName,
          orderCode: verified.orderCode,
          payload: json(safePayload(payload)),
          payloadHash: hashed,
          signatureValid: true,
          processingStatus: safeCode(error),
        },
      });
      throw error;
    }
  }
  async accept(
    gatewayName: GatewayName,
    verified: VerifiedPayment,
    log?: { hash: string; payload: unknown },
  ) {
    const existing = await this.ctx.db.paymentOrder.findUnique({
      where: { orderCode: verified.orderCode },
      select: { id: true, userId: true },
    });
    assert(existing, 404, 'PAYMENT_ORDER_NOT_FOUND');
    return this.ctx.db.$transaction(
      async (tx) => {
        await lockPlayer(tx, existing.userId);
        const order = await new PaymentTransactionRepository(tx).lockOrder(
          existing.id,
        );
        const t = order.transaction!;
        assert(t.gateway === gatewayName, 400, 'PAYMENT_GATEWAY_MISMATCH');
        assert(
          verified.amount === order.totalAmount && verified.amount === t.amount,
          400,
          'PAYMENT_AMOUNT_MISMATCH',
        );
        assert(
          !verified.requestId || verified.requestId === t.id,
          400,
          'PAYMENT_REQUEST_MISMATCH',
        );
        if (verified.status === 'SUCCESS') {
          assert(
            verified.gatewayTransactionId !== '0' &&
              !!verified.gatewayTransactionId,
            400,
            'PAYMENT_TRANSACTION_MISSING',
          );
          assert(
            !t.gatewayTransactionId ||
              t.gatewayTransactionId === verified.gatewayTransactionId,
            409,
            'PAYMENT_TRANSACTION_CONFLICT',
          );
          const duplicate = await tx.paymentTransaction.findFirst({
            where: {
              gateway: gatewayName,
              gatewayTransactionId: verified.gatewayTransactionId,
              id: { not: t.id },
            },
          });
          assert(!duplicate, 409, 'PAYMENT_TRANSACTION_REUSED');
        }
        const already = t.status === 'SUCCESS';
        if (log)
          await tx.paymentWebhookLog.create({
            data: {
              gateway: gatewayName,
              orderCode: verified.orderCode,
              payload: json(log.payload),
              payloadHash: log.hash,
              signatureValid: true,
              processingStatus: already ? 'ALREADY_CONFIRMED' : 'ACCEPTED',
            },
          });
        if (already) return { duplicate: true };
        const at = new Date(this.ctx.now());
        if (verified.status === 'SUCCESS') {
          await tx.paymentTransaction.update({
            where: { id: t.id },
            data: {
              status: 'SUCCESS',
              gatewayTransactionId: verified.gatewayTransactionId,
              gatewayResponse: json(verified.response),
              paidAt: at,
            },
          });
          const updated = await tx.paymentOrder.update({
            where: { id: order.id },
            data: { status: 'PROCESSING' },
            include: orderInclude,
          });
          await tx.paymentOutbox.upsert({
            where: { key: `fulfill:${order.id}` },
            update: {},
            create: {
              userId: order.userId,
              orderId: order.id,
              key: `fulfill:${order.id}`,
              type: 'FULFILLMENT',
              payload: {},
              availableAt: at,
            },
          });
          await enqueueNotification(
            tx,
            updated,
            'payment:processing',
            `processing:${order.id}`,
            at.getTime(),
          );
        } else {
          // Pending query results never reopen a cancelled/expired order or downgrade a receipt.
          if (verified.status === 'PROCESSING' && order.status !== 'PENDING')
            return { duplicate: false };
          const status =
            verified.status === 'PROCESSING' ? 'PENDING' : verified.status;
          if (t.status === status) return { duplicate: true };
          await tx.paymentTransaction.update({
            where: { id: t.id },
            data: { status, gatewayResponse: json(verified.response) },
          });
          const updated = await tx.paymentOrder.update({
            where: { id: order.id },
            data: { status },
            include: orderInclude,
          });
          await enqueueNotification(
            tx,
            updated,
            status === 'EXPIRED'
              ? 'payment:expired'
              : status === 'PENDING'
                ? 'payment:pending'
                : 'payment:failed',
            `${status}:${order.id}`,
            at.getTime(),
          );
        }
        return { duplicate: false };
      },
      { timeout: 15000 },
    );
  }
  async fulfill(id: string) {
    const found = await this.ctx.db.paymentOrder.findUniqueOrThrow({
      where: { id },
      select: { userId: true },
    });
    await this.ctx.db.$transaction(
      async (tx) => {
        await lockPlayer(tx, found.userId);
        const order = await new PaymentTransactionRepository(tx).lockOrder(id);
        if (order.status === 'PAID') return;
        assert(
          order.transaction?.status === 'SUCCESS',
          409,
          'PAYMENT_NOT_CONFIRMED',
        );
        const at = new Date(this.ctx.now());
        await this.beforeGrant?.();
        for (const item of order.items) {
          if (item.fulfillment) continue;
          if (item.kind === 'DIAMOND') {
            await diamondLedger(
              tx,
              order.userId,
              BigInt(item.quantity),
              'PAYMENT_TOPUP',
              `PAYMENT:${item.id}`,
              at.getTime(),
            );
            const receipt = await tx.diamondTransaction.findUniqueOrThrow({
              where: { reference: `PAYMENT:${item.id}` },
            });
            await tx.paymentFulfillmentLog.create({
              data: {
                orderItemId: item.id,
                userId: order.userId,
                inventoryId: null,
                diamondTransactionId: receipt.id,
                quantity: item.quantity,
                fulfilledAt: at,
              },
            });
            continue;
          }
          // A second paid order must deliver its own gear, even if another purchase won the race.
          const inventory = await grantItem(
            tx,
            order.userId,
            item.itemId,
            item.kind,
            item.quantity,
            true,
          );
          await tx.paymentFulfillmentLog.create({
            data: {
              orderItemId: item.id,
              userId: order.userId,
              inventoryId: inventory.id,
              quantity: item.quantity,
              fulfilledAt: at,
            },
          });
        }
        const updated = await tx.paymentOrder.update({
          where: { id },
          data: { status: 'PAID', paidAt: at },
          include: orderInclude,
        });
        await event(
          tx,
          order.userId,
          'payment_fulfilled',
          {
            orderId: id,
            amountVnd: order.totalAmount.toString(),
            transactionId: order.transaction!.id,
          },
          at.getTime(),
        );
        await tx.paymentOutbox.updateMany({
          where: { key: `fulfill:${id}`, processedAt: null },
          data: { processedAt: at, lastError: null },
        });
        await enqueueNotification(
          tx,
          updated,
          'payment:success',
          `success:${id}`,
          at.getTime(),
        );
      },
      { timeout: 15000 },
    );
  }
  private async expire(id: string) {
    const existing = await this.ctx.db.paymentOrder.findFirst({
      where: {
        id,
        status: 'PENDING',
        expiresAt: { lte: new Date(this.ctx.now()) },
      },
      select: { userId: true },
    });
    if (!existing) return;
    await this.ctx.db.$transaction(async (tx) => {
      await lockPlayer(tx, existing.userId);
      const order = await new PaymentTransactionRepository(tx).lockOrder(id);
      if (order.status !== 'PENDING' || order.transaction!.status === 'SUCCESS')
        return;
      await tx.paymentTransaction.update({
        where: { orderId: id },
        data: { status: 'EXPIRED' },
      });
      const updated = await tx.paymentOrder.update({
        where: { id },
        data: { status: 'EXPIRED' },
        include: orderInclude,
      });
      await enqueueNotification(
        tx,
        updated,
        'payment:expired',
        `EXPIRED:${id}`,
        this.ctx.now(),
      );
    });
  }
  async get(id: string, userId: string) {
    await new PaymentTransactionRepository(this.ctx.db).ownedOrder(id, userId);
    await this.expire(id);
    return orderDto(
      await new PaymentTransactionRepository(this.ctx.db).ownedOrder(
        id,
        userId,
      ),
    );
  }
  async reconcile(id: string, userId?: string, ip = '127.0.0.1') {
    const order = userId
      ? await new PaymentTransactionRepository(this.ctx.db).ownedOrder(
          id,
          userId,
        )
      : await this.ctx.db.paymentOrder.findUniqueOrThrow({
          where: { id },
          include: orderInclude,
        });
    if (order.transaction!.status === 'SUCCESS') {
      await this.fulfill(id);
      return this.get(id, order.userId);
    }
    const claimed = await this.ctx.db.paymentTransaction.updateMany({
      where: {
        orderId: id,
        status: { not: 'SUCCESS' },
        OR: [
          { lastQueriedAt: null },
          { lastQueriedAt: { lt: new Date(this.ctx.now() - 15000) } },
        ],
      },
      data: { lastQueriedAt: new Date(this.ctx.now()) },
    });
    if (claimed.count) {
      const gateway = this.gateway(order.transaction!.method);
      const result = await gateway.query(
        this.gatewayOrder(order, this.config.queryIp ?? ip),
      );
      await this.accept(gateway.name, result);
      await this.drain();
    }
    return this.get(id, order.userId);
  }
  async list(query: z.infer<typeof paymentListQuerySchema>, userId?: string) {
    const where: Prisma.PaymentOrderWhereInput = {
      ...(userId || query.userId ? { userId: userId ?? query.userId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.gateway ? { transaction: { gateway: query.gateway } } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    if (query.cursor) {
      const cursor = await this.ctx.db.paymentOrder.findFirst({
        where: { AND: [where, { id: query.cursor }] },
        select: { createdAt: true, id: true },
      });
      assert(cursor, 400, 'INVALID_CURSOR');
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        },
      ];
    }
    const rows = await this.ctx.db.paymentOrder.findMany({
      where,
      include: orderInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 31,
    });
    const more = rows.length > 30;
    if (more) rows.pop();
    return {
      items: rows.map((order) => ({
        ...orderDto(order),
        ...(!userId ? { userId: order.userId } : {}),
      })),
      nextCursor: more ? rows.at(-1)!.id : null,
    };
  }
  private draining?: Promise<void>;
  async idle() {
    await this.draining;
  }
  drain() {
    if (this.draining) return this.draining;
    this.draining = this.drainWork().finally(() => {
      this.draining = undefined;
    });
    return this.draining;
  }
  private async drainWork() {
    const pending = await this.ctx.db.paymentOutbox.findMany({
      where: {
        processedAt: null,
        availableAt: { lte: new Date(this.ctx.now()) },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 100,
    });
    for (const row of pending) {
      try {
        if (row.type === 'FULFILLMENT') await this.fulfill(row.orderId);
        else {
          await this.publisher(
            row.userId,
            row.payload as unknown as PaymentEvent,
          );
          await this.ctx.db.paymentOutbox.updateMany({
            where: { id: row.id, processedAt: null },
            data: { processedAt: new Date(this.ctx.now()) },
          });
        }
      } catch (error) {
        await this.ctx.db.paymentOutbox.updateMany({
          where: { id: row.id, processedAt: null },
          data: {
            attempts: { increment: 1 },
            lastError: safeCode(error),
            availableAt: new Date(
              this.ctx.now() +
                Math.min(60000, 1000 * 2 ** Math.min(6, row.attempts)),
            ),
          },
        });
        this.ctx.app.log.warn(
          { orderId: row.orderId, code: safeCode(error) },
          'Payment outbox retry scheduled',
        );
      }
    }
  }
  async sweep() {
    const due = await this.ctx.db.paymentOrder.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lte: new Date(this.ctx.now()) },
      },
      take: 100,
      select: { id: true },
    });
    for (const order of due) await this.expire(order.id);
    // Reconcile recent unresolved and locally expired orders; IPNs remain valid indefinitely.
    const candidates = await this.ctx.db.paymentOrder.findMany({
      where: {
        status: { in: ['PENDING', 'EXPIRED', 'FAILED', 'CANCELLED'] },
        createdAt: {
          gte: new Date(this.ctx.now() - 7 * 86400000),
          lte: new Date(this.ctx.now() - 30000),
        },
        transaction: {
          OR: [
            { lastQueriedAt: null },
            { lastQueriedAt: { lt: new Date(this.ctx.now() - 60000) } },
          ],
        },
      },
      orderBy: {
        transaction: { lastQueriedAt: { sort: 'asc', nulls: 'first' } },
      },
      take: 5,
      select: { id: true },
    });
    for (const order of candidates) {
      try {
        await this.reconcile(order.id);
      } catch (error) {
        this.ctx.app.log.warn(
          { orderId: order.id, code: safeCode(error) },
          'Payment reconciliation will retry',
        );
      }
    }
  }
}
