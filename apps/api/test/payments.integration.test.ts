import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { DEFAULT_CONFIG } from '@fwo/game-config';
import type { PaymentOrderDto, PaymentEvent } from '@fwo/contracts';
import { buildApp } from '../src/app.js';
import { activateConfiguration } from '../src/modules/admin/config.js';
import type { OutboundMessage } from '../src/types.js';
import { momoIpn, signVnpay, testPaymentConfig } from './payment-fixtures.js';

const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !/^\/fishing_world_(?:[a-z0-9]+_)*test$/.test(new URL(url).pathname)
)
  throw new Error('Payments require an isolated fishing_world_*test database.');
let built: Awaited<ReturnType<typeof buildApp>>;
let clock = Date.now(),
  failGrant = false;
let base = '',
  productId = '',
  transactionSequence = 1000000;
const messages = new Map<string, OutboundMessage>();
type Actor = { id: string; token: string };
const headers = (actor: Actor, key = randomUUID()) => ({
  authorization: `Bearer ${actor.token}`,
  'idempotency-key': key,
  origin: 'http://localhost:5173',
});
const clear =
  'TRUNCATE TABLE users, payment_products, system_configs, fish_species, fishing_locations, equipment, bait_types, missions, achievements CASCADE';
async function register(): Promise<Actor> {
  const suffix = randomUUID().slice(0, 8),
    email = `payment-${suffix}@example.test`;
  const start = await built.app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      channel: 'email',
      email,
      username: `pay-${suffix}`,
      password: 'Payment-test-123',
      acceptTerms: true,
    },
  });
  expect(start.statusCode, start.body).toBe(202);
  const response = await built.app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/verify',
    payload: {
      challengeId: start.json().data.challengeId,
      code: messages.get(email)!.code,
    },
  });
  expect(response.statusCode, response.body).toBe(201);
  return {
    id: response.json().data.profile.id,
    token: response.json().data.accessToken,
  };
}
async function create(
  actor: Actor,
  method = 'VNPAY',
  key = randomUUID(),
  quantity = 1,
) {
  const r = await built.app.inject({
    method: 'POST',
    url: '/api/v1/payments/orders',
    headers: headers(actor, key),
    payload: { productId, method, quantity },
  });
  expect(r.statusCode, r.body).toBe(201);
  return r.json().data as PaymentOrderDto;
}
function ipn(order: PaymentOrderDto, overrides: Record<string, string> = {}) {
  return signVnpay({
    vnp_TmnCode: 'TESTTMN1',
    vnp_TxnRef: order.orderCode,
    vnp_Amount: (BigInt(order.totalAmount) * 100n).toString(),
    vnp_TransactionNo: String(++transactionSequence),
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    ...overrides,
  });
}
async function sendIpn(payload: Record<string, string>) {
  return built.app.inject({
    method: 'GET',
    url: `/api/v1/payments/webhooks/vnpay?${new URLSearchParams(payload)}`,
  });
}
async function quantity(actor: Actor) {
  const r = await built.db.userInventory.findFirstOrThrow({
    where: { userId: actor.id, baitTypeId: DEFAULT_CONFIG.baits[0]!.id },
  });
  return r.quantity;
}
async function connect(actor: Actor) {
  const socket = new WebSocket(
    base.replace('http:', 'ws:') + '/api/v1/payments/socket',
    { origin: 'http://localhost:5173' },
  );
  await once(socket, 'open');
  const ready = once(socket, 'message');
  socket.send(JSON.stringify({ accessToken: actor.token }));
  expect(JSON.parse(String((await ready)[0])).event).toBe('payment:connected');
  return socket;
}
beforeAll(async () => {
  built = await buildApp({
    databaseUrl: url,
    jwtSecret: 'isolated-payment-integration-test-secret-123',
    logger: false,
    now: () => clock,
    disableRateLimit: true,
    paymentConfig: testPaymentConfig,
    paymentFetch: async () => {
      throw new Error('No external provider network in integration tests');
    },
    beforePaymentGrant: async () => {
      if (failGrant) throw new Error('Injected grant failure');
    },
    sendMessage: async (message) => {
      messages.set(message.to, message);
    },
    env: {
      nodeEnv: 'test',
      redisUrl: undefined,
      smtpHost: undefined,
      allowedOrigins: ['http://localhost:5173'],
    },
  });
  await built.app.ready();
  await built.db.$executeRawUnsafe(clear);
  await built.db.$transaction((tx) =>
    activateConfiguration(tx, DEFAULT_CONFIG, clock),
  );
  const product = await built.db.paymentProduct.create({
    data: {
      name: 'Gói giun sandbox',
      description: '10 mồi giun',
      amountVnd: 10000n,
      active: true,
      items: [
        { itemId: DEFAULT_CONFIG.baits[0]!.id, kind: 'BAIT', quantity: 10 },
      ],
    },
  });
  productId = product.id;
  base = await built.app.listen({ host: '127.0.0.1', port: 0 });
}, 30000);
afterAll(async () => {
  if (!built) return;
  await built.app.close();
  // App close disconnects its client; a short-lived client cleans only this guarded test DB.
  const { createDatabase } = await import('../src/db.js');
  const cleanup = createDatabase(url!);
  try {
    await cleanup.$executeRawUnsafe(clear);
  } finally {
    await cleanup.$disconnect();
  }
});
describe.sequential(
  'real PostgreSQL payments, fulfillment and WebSocket',
  () => {
    it('prices on the server, snapshots bundles, and deduplicates concurrent create requests', async () => {
      const actor = await register(),
        key = randomUUID();
      const orders = await Promise.all(
        Array.from({ length: 10 }, () => create(actor, 'VNPAY', key, 2)),
      );
      expect(new Set(orders.map((o) => o.id)).size).toBe(1);
      expect(orders[0]).toMatchObject({
        totalAmount: '20000',
        status: 'PENDING',
      });
      expect(orders[0]!.items[0]!.quantity).toBe(20);
      const tamper = await built.app.inject({
        method: 'POST',
        url: '/api/v1/payments/orders',
        headers: headers(actor),
        payload: { productId, method: 'VNPAY', quantity: 1, totalAmount: 1 },
      });
      expect(tamper.statusCode).toBe(400);
      expect(
        await built.db.paymentOrder.count({ where: { userId: actor.id } }),
      ).toBe(1);
    });
    it('creates a stable VNPay checkout, rejects cross-user access and retains orders during gateway outage', async () => {
      const actor = await register(),
        other = await register(),
        order = await create(actor);
      const r = await built.app.inject({
        method: 'POST',
        url: `/api/v1/payments/orders/${order.id}/checkout`,
        headers: headers(actor),
        payload: {},
      });
      expect(r.statusCode, r.body).toBe(200);
      expect(
        new URL(r.json().data.paymentUrl).searchParams.get('vnp_Amount'),
      ).toBe('1000000');
      for (const suffix of ['', '/checkout', '/check']) {
        const denied = await built.app.inject({
          method: suffix ? 'POST' : 'GET',
          url: `/api/v1/payments/orders/${order.id}${suffix}`,
          headers: headers(other),
          ...(suffix ? { payload: {} } : {}),
        });
        expect(denied.statusCode).toBe(404);
      }
      const momo = await create(actor, 'MOMO');
      const outage = await built.app.inject({
        method: 'POST',
        url: `/api/v1/payments/orders/${momo.id}/checkout`,
        headers: headers(actor),
        payload: {},
      });
      expect(outage.statusCode).toBe(503);
      expect((await built.payments.get(momo.id, actor.id)).status).toBe(
        'PENDING',
      );
    });
    it('rejects forged, mismatched and replayed transaction identities without granting', async () => {
      const actor = await register(),
        order = await create(actor),
        before = await quantity(actor);
      const payload = ipn(order);
      const forged = await sendIpn({ ...payload, vnp_Amount: '100' });
      expect(forged.json().RspCode).toBe('97');
      expect(
        (await sendIpn(ipn(order, { vnp_Amount: '100' }))).json().RspCode,
      ).toBe('04');
      expect(await quantity(actor)).toBe(before);
      expect(
        await built.db.paymentWebhookLog.count({
          where: { signatureValid: false },
        }),
      ).toBeGreaterThan(0);
      expect((await sendIpn(payload)).json().RspCode).toBe('00');
      const other = await create(actor);
      expect(
        (
          await sendIpn(
            ipn(other, { vnp_TransactionNo: payload.vnp_TransactionNo! }),
          )
        ).json().RspCode,
      ).toBe('99');
      expect((await built.payments.get(other.id, actor.id)).status).toBe(
        'PENDING',
      );
    });
    it('processes ten concurrent identical IPNs exactly once, including immutable grant history', async () => {
      const actor = await register(),
        order = await create(actor),
        before = await quantity(actor),
        payload = ipn(order);
      const result = await Promise.all(
        Array.from({ length: 10 }, () => sendIpn(payload)),
      );
      expect(result.every((r) => ['00', '02'].includes(r.json().RspCode))).toBe(
        true,
      );
      await built.payments.drain();
      expect(await quantity(actor)).toBe(before + 10);
      expect((await built.payments.get(order.id, actor.id)).status).toBe(
        'PAID',
      );
      expect(
        await built.db.paymentFulfillmentLog.count({
          where: { item: { orderId: order.id } },
        }),
      ).toBe(1);
      expect(
        await built.db.analyticsEvent.count({
          where: { userId: actor.id, eventName: 'payment_fulfilled' },
        }),
      ).toBe(1);
      await expect(
        built.db.paymentFulfillmentLog.updateMany({
          where: { userId: actor.id },
          data: { quantity: 99 },
        }),
      ).rejects.toThrow();
      const wallet = await built.db.wallet.findUniqueOrThrow({
        where: { userId: actor.id },
      });
      expect(wallet.balanceGold).toBe(200n);
    });
    it('accepts signed MoMo notifications and refuses a mismatched MoMo request ID', async () => {
      const actor = await register(),
        order = await create(actor, 'MOMO');
      const wrong = await built.app.inject({
        method: 'POST',
        url: '/api/v1/payments/webhooks/momo',
        payload: momoIpn(order.orderCode, randomUUID(), ++transactionSequence),
      });
      expect(wrong.statusCode).toBe(400);
      const payload = momoIpn(
        order.orderCode,
        order.transactionId,
        ++transactionSequence,
      );
      for (let i = 0; i < 3; i++)
        expect(
          (
            await built.app.inject({
              method: 'POST',
              url: '/api/v1/payments/webhooks/momo',
              payload,
            })
          ).statusCode,
        ).toBe(204);
      expect((await built.payments.get(order.id, actor.id)).status).toBe(
        'PAID',
      );
    });
    it('keeps a durable verified receipt on fulfillment failure and retries without losing or doubling items', async () => {
      const actor = await register(),
        order = await create(actor),
        before = await quantity(actor);
      failGrant = true;
      try {
        expect((await sendIpn(ipn(order))).json().RspCode).toBe('00');
        expect(await built.payments.get(order.id, actor.id)).toMatchObject({
          status: 'PROCESSING',
          paymentStatus: 'SUCCESS',
        });
        expect(await quantity(actor)).toBe(before);
        expect(
          (
            await built.db.paymentOutbox.findUniqueOrThrow({
              where: { key: `fulfill:${order.id}` },
            })
          ).processedAt,
        ).toBeNull();
      } finally {
        failGrant = false;
      }
      clock += 2000;
      await built.payments.drain();
      await built.payments.fulfill(order.id);
      expect((await built.payments.get(order.id, actor.id)).status).toBe(
        'PAID',
      );
      expect(await quantity(actor)).toBe(before + 10);
    });
    it('handles cancellation, expiry and late success without rejecting paid entitlements', async () => {
      const actor = await register(),
        cancelled = await create(actor),
        expired = await create(actor);
      expect(
        (
          await sendIpn(
            ipn(cancelled, {
              vnp_ResponseCode: '24',
              vnp_TransactionStatus: '02',
            }),
          )
        ).json().RspCode,
      ).toBe('00');
      expect((await built.payments.get(cancelled.id, actor.id)).status).toBe(
        'CANCELLED',
      );
      clock += 16 * 60000;
      expect((await built.payments.get(expired.id, actor.id)).status).toBe(
        'EXPIRED',
      );
      expect((await sendIpn(ipn(expired))).json().RspCode).toBe('00');
      expect((await built.payments.get(expired.id, actor.id)).status).toBe(
        'PAID',
      );
      expect(
        (
          await sendIpn(
            ipn(expired, {
              vnp_ResponseCode: '24',
              vnp_TransactionStatus: '02',
            }),
          )
        ).json().RspCode,
      ).toBe('02');
      expect((await built.payments.get(expired.id, actor.id)).status).toBe(
        'PAID',
      );
      clock = Date.now();
    });
    it('notifies only the owner over a real WebSocket and recovers committed inventory after disconnect', async () => {
      const actor = await register(),
        other = await register(),
        ownerSocket = await connect(actor),
        otherSocket = await connect(other);
      const ownerEvents: PaymentEvent[] = [],
        otherEvents: PaymentEvent[] = [];
      ownerSocket.on('message', (raw) =>
        ownerEvents.push(JSON.parse(raw.toString())),
      );
      otherSocket.on('message', (raw) =>
        otherEvents.push(JSON.parse(raw.toString())),
      );
      try {
        const order = await create(actor),
          before = await quantity(actor);
        await sendIpn(ipn(order));
        await built.payments.drain();
        await expect
          .poll(() =>
            ownerEvents.some(
              (e) => e.event === 'payment:success' && e.data.id === order.id,
            ),
          )
          .toBe(true);
        expect(otherEvents).toHaveLength(0);
        ownerSocket.terminate();
        const offlineOrder = await create(actor);
        await sendIpn(ipn(offlineOrder));
        const reconnected = await connect(actor);
        reconnected.terminate();
        const inventory = await built.app.inject({
          url: '/api/v1/inventory',
          headers: headers(actor),
        });
        expect(inventory.statusCode).toBe(200);
        expect(await quantity(actor)).toBe(before + 20);
        expect(
          (await built.payments.get(offlineOrder.id, actor.id)).status,
        ).toBe('PAID');
      } finally {
        ownerSocket.terminate();
        otherSocket.terminate();
      }
    });
    it('gates payment admin and audits product edits with optimistic versions', async () => {
      const actor = await register();
      const blocked = await built.app.inject({
        url: '/api/v1/admin/payments/orders',
        headers: headers(actor),
      });
      expect(blocked.statusCode).toBe(403);
      await built.db.adminUser.create({
        data: { userId: actor.id, role: 'SUPER_ADMIN' },
      });
      const update = {
        name: 'Gói sandbox sửa',
        description: 'Gói cập nhật',
        amountVnd: '20000',
        active: true,
        items: [
          { itemId: DEFAULT_CONFIG.baits[0]!.id, kind: 'BAIT', quantity: 10 },
        ],
        expectedVersion: 1,
        reason: 'Sandbox catalog update',
      };
      const saved = await built.app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/payments/products/${productId}`,
        headers: headers(actor),
        payload: update,
      });
      expect(saved.statusCode, saved.body).toBe(200);
      const stale = await built.app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/payments/products/${productId}`,
        headers: headers(actor),
        payload: update,
      });
      expect(stale.statusCode).toBe(409);
      expect(
        await built.db.auditLog.count({
          where: { actorId: actor.id, action: 'PAYMENT_PRODUCT_UPDATE' },
        }),
      ).toBe(1);
      const report = await built.app.inject({
        url: '/api/v1/admin/payments/report',
        headers: headers(actor),
      });
      expect(report.statusCode, report.body).toBe(200);
      expect(BigInt(report.json().data.revenueVnd)).toBeGreaterThan(0n);
    });
  },
);
