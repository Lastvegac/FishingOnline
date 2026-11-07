import { z } from 'zod';
import type { Redis } from 'ioredis';
import type { Prisma } from '@prisma/client';
import {
  paymentListQuerySchema,
  paymentProductInputSchema,
} from '@fwo/contracts';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import { json } from '../../db.js';
import { assert, ApiError } from '../../lib/errors.js';
import { mutation } from '../../lib/transaction.js';
import type { PaymentConfig } from './config.js';
import { loadPaymentConfig } from './config.js';
import type { GatewayFetch } from './gateways.js';
import { PaymentService } from './service.js';
import { orderInclude, orderDto } from './repository.js';
import { RealtimeNotificationService } from './realtime.js';

const auth = { config: { auth: true }, schema: { tags: ['Payments'] } };
const readers = {
  config: {
    auth: true,
    roles: ['SUPER_ADMIN', 'GAME_ADMIN', 'SUPPORT', 'ANALYST'],
  },
  schema: { tags: ['Payments admin'] },
};
const writers = {
  config: { auth: true, roles: ['SUPER_ADMIN'] },
  schema: { tags: ['Payments admin'] },
};
const idFrom = (params: unknown) => z.object({ id: z.uuid() }).parse(params).id;
const empty = z.strictObject({});
export function registerPayments(
  ctx: Context,
  options: {
    config?: PaymentConfig;
    fetcher?: GatewayFetch;
    beforeGrant?: () => Promise<void>;
    redis?: Redis;
  } = {},
) {
  const { app, db } = ctx;
  const service = new PaymentService(
    ctx,
    options.config ?? loadPaymentConfig(),
    options.fetcher,
    options.beforeGrant,
  );
  const realtime = new RealtimeNotificationService(ctx, options.redis);
  service.setPublisher((userId, payload) => realtime.publish(userId, payload));
  app.get('/api/v1/payments/catalog', auth, async (request) => ({
    data: await service.orders.catalog(principal(request).id),
  }));
  app.post(
    '/api/v1/payments/orders',
    {
      ...auth,
      config: {
        ...auth.config,
        rateLimit: { max: 10, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      await ctx.limitAuthAccount?.(
        `payment:${principal(request).id}`,
        10,
        60000,
      );
      const id = await service.orders.create(request);
      // Checkout is a separate retryable operation; gateway outages never lose the order.
      reply.code(201);
      return { data: await service.get(id, principal(request).id) };
    },
  );
  app.get('/api/v1/payments/orders', auth, async (request) => {
    const query = z
      .strictObject({ cursor: z.uuid().optional() })
      .parse(request.query);
    return { data: await service.list(query, principal(request).id) };
  });
  app.get('/api/v1/payments/orders/:id', auth, async (request) => ({
    data: await service.get(idFrom(request.params), principal(request).id),
  }));
  app.post('/api/v1/payments/orders/:id/checkout', auth, async (request) => {
    empty.parse(request.body);
    await ctx.limitAuthAccount?.(
      `payment-checkout:${principal(request).id}`,
      20,
      60000,
    );
    return {
      data: await service.checkout(
        idFrom(request.params),
        principal(request).id,
        request.ip,
      ),
    };
  });
  app.post('/api/v1/payments/orders/:id/check', auth, async (request) => {
    empty.parse(request.body);
    await ctx.limitAuthAccount?.(
      `payment-check:${principal(request).id}`,
      20,
      60000,
    );
    return {
      data: await service.reconcile(
        idFrom(request.params),
        principal(request).id,
        request.ip,
      ),
    };
  });
  // Provider-specific acknowledgements: no JSON envelope and no browser authentication.
  app.post(
    '/api/v1/payments/webhooks/momo',
    {
      schema: { tags: ['Payments IPN'], response: { '204': { type: 'null' } } },
      config: { rateLimit: { max: 300, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      await service.webhook('MOMO', request.body);
      return reply.code(204).send();
    },
  );
  app.get(
    '/api/v1/payments/webhooks/vnpay',
    {
      schema: {
        tags: ['Payments IPN'],
        response: {
          '200': {
            type: 'object',
            properties: {
              RspCode: { type: 'string' },
              Message: { type: 'string' },
            },
            required: ['RspCode', 'Message'],
          },
        },
      },
      config: { rateLimit: { max: 300, timeWindow: '1 minute' } },
    },
    async (request) => {
      try {
        const result = await service.webhook('VNPAY', request.query);
        return {
          RspCode: result.duplicate ? '02' : '00',
          Message: result.duplicate
            ? 'Order already confirmed'
            : 'Confirm Success',
        };
      } catch (error) {
        const code = error instanceof ApiError ? error.code : '';
        return {
          RspCode:
            code === 'PAYMENT_ORDER_NOT_FOUND'
              ? '01'
              : code === 'PAYMENT_AMOUNT_MISMATCH'
                ? '04'
                : code === 'INVALID_PAYMENT_SIGNATURE'
                  ? '97'
                  : '99',
          Message: 'Unable to confirm',
        };
      }
    },
  );
  app.get('/api/v1/admin/payments/orders', readers, async (request) => ({
    data: await service.list(paymentListQuerySchema.parse(request.query)),
  }));
  app.get('/api/v1/admin/payments/report', readers, async (request) => {
    const q = paymentListQuerySchema.parse(request.query);
    const where: Prisma.PaymentOrderWhereInput = {
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.gateway ? { transaction: { gateway: q.gateway } } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
    };
    const [groups, revenue, received, backlog] = await Promise.all([
      db.paymentOrder.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      db.paymentOrder.aggregate({
        where: { AND: [where, { status: 'PAID' }] },
        _sum: { totalAmount: true },
      }),
      db.paymentTransaction.aggregate({
        where: { order: where, status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      db.paymentOutbox.count({
        where: { type: 'FULFILLMENT', processedAt: null },
      }),
    ]);
    return {
      data: {
        revenueVnd: (revenue._sum.totalAmount ?? 0n).toString(),
        receivedVnd: (received._sum.amount ?? 0n).toString(),
        counts: Object.fromEntries(
          groups.map((g) => [g.status, g._count._all]),
        ),
        fulfillmentBacklog: backlog,
      },
    };
  });
  app.get('/api/v1/admin/payments/orders/:id', readers, async (request) => {
    const order = await db.paymentOrder.findUnique({
      where: { id: idFrom(request.params) },
      include: orderInclude,
    });
    assert(order, 404, 'PAYMENT_ORDER_NOT_FOUND');
    const [webhooks, retries] = await Promise.all([
      db.paymentWebhookLog.findMany({
        where: { orderCode: order.orderCode },
        orderBy: { receivedAt: 'desc' },
        take: 100,
      }),
      db.paymentOutbox.findMany({
        where: { orderId: order.id, type: 'FULFILLMENT' },
      }),
    ]);
    return {
      data: {
        order: orderDto(order),
        userId: order.userId,
        transaction: {
          gatewayTransactionId: order.transaction!.gatewayTransactionId,
          gatewayResponse: order.transaction!.gatewayResponse,
          paidAt: order.transaction!.paidAt?.toISOString() ?? null,
        },
        webhooks,
        fulfillments: order.items.flatMap((i) =>
          i.fulfillment ? [i.fulfillment] : [],
        ),
        retries,
      },
    };
  });
  app.post(
    '/api/v1/admin/payments/orders/:id/reconcile',
    writers,
    async (request) => {
      const id = idFrom(request.params);
      const input = z
        .strictObject({ reason: z.string().min(5).max(1000) })
        .parse(request.body);
      await ctx.limitAuthAccount?.(
        `payment-admin:${principal(request).id}`,
        20,
        60000,
      );
      await mutation(
        ctx,
        request,
        `/admin/payments/${id}/reconcile`,
        async (tx, actorId) => {
          const order = await tx.paymentOrder.findUnique({
            where: { id },
            select: { status: true },
          });
          assert(order, 404, 'PAYMENT_ORDER_NOT_FOUND');
          await tx.auditLog.create({
            data: {
              actorId,
              actorSnapshot: { role: principal(request).role },
              action: 'PAYMENT_RECONCILE_REQUEST',
              targetType: 'payment_order',
              targetId: id,
              before: json(order),
              reason: input.reason,
              requestId: request.id,
            },
          });
          return { requested: true };
        },
      );
      return { data: await service.reconcile(id) };
    },
  );
  app.get('/api/v1/admin/payments/products', writers, async () => ({
    data: {
      items: await db.paymentProduct.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    },
  }));
  app.post('/api/v1/admin/payments/products', writers, async (request) => {
    const input = paymentProductInputSchema.parse(request.body);
    return {
      data: await mutation(
        ctx,
        request,
        '/admin/payments/products',
        async (tx, actorId) => {
          await service.orders.resolveItems(tx, input.items);
          const { reason, expectedVersion: _expected, ...fields } = input;
          const product = await tx.paymentProduct.create({
            data: {
              ...fields,
              items: json(input.items),
              amountVnd: BigInt(input.amountVnd),
            },
          });
          await tx.auditLog.create({
            data: {
              actorId,
              actorSnapshot: { role: 'SUPER_ADMIN' },
              action: 'PAYMENT_PRODUCT_CREATE',
              targetType: 'payment_product',
              targetId: product.id,
              after: json(product),
              reason,
              requestId: request.id,
            },
          });
          return product;
        },
      ),
    };
  });
  app.patch('/api/v1/admin/payments/products/:id', writers, async (request) => {
    const id = idFrom(request.params),
      input = paymentProductInputSchema.parse(request.body);
    return {
      data: await mutation(
        ctx,
        request,
        `/admin/payments/products/${id}`,
        async (tx, actorId) => {
          await tx.$queryRaw`SELECT id FROM payment_products WHERE id = ${id}::uuid FOR UPDATE`;
          const before = await tx.paymentProduct.findUniqueOrThrow({
            where: { id },
          });
          assert(
            before.version === input.expectedVersion,
            409,
            'VERSION_CONFLICT',
          );
          await service.orders.resolveItems(tx, input.items);
          const { reason, expectedVersion: _expected, ...fields } = input;
          const product = await tx.paymentProduct.update({
            where: { id },
            data: {
              ...fields,
              amountVnd: BigInt(input.amountVnd),
              items: json(input.items),
              version: { increment: 1 },
            },
          });
          await tx.auditLog.create({
            data: {
              actorId,
              actorSnapshot: { role: 'SUPER_ADMIN' },
              action: 'PAYMENT_PRODUCT_UPDATE',
              targetType: 'payment_product',
              targetId: id,
              before: json(before),
              after: json(product),
              reason,
              requestId: request.id,
            },
          });
          return product;
        },
      ),
    };
  });
  let worker: ReturnType<typeof setInterval> | undefined,
    sweeper: ReturnType<typeof setInterval> | undefined;
  let sweeping: Promise<void> | undefined;
  app.addHook('onReady', async () => {
    await realtime.start();
    worker = setInterval(() => {
      void service
        .drain()
        .catch(() => app.log.error('Payment outbox unavailable'));
    }, 500);
    sweeper = setInterval(() => {
      if (sweeping) return;
      sweeping = service
        .sweep()
        .catch(() => app.log.error('Payment reconciliation unavailable'))
        .finally(() => {
          sweeping = undefined;
        });
    }, 10000);
    worker.unref();
    sweeper.unref();
  });
  // Fastify preClose releases upgraded sockets before waiting for HTTP server.close.
  app.addHook('preClose', async () => {
    if (worker) clearInterval(worker);
    if (sweeper) clearInterval(sweeper);
    await realtime.close();
    await sweeping;
    await service.idle();
  });
  return service;
}
