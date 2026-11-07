import { buildApp } from '../../apps/api/src/app.js';
import { testPaymentConfig } from '../../apps/api/test/payment-fixtures.js';

const dbName = new URL(process.env.DATABASE_URL ?? '').pathname;
if (
  process.env.NODE_ENV !== 'test' ||
  !/^\/fishing_world_(?:[a-z0-9]+_)*test$/.test(dbName)
)
  throw new Error('Payment E2E harness requires an isolated test database.');
const origin = 'http://127.0.0.1:4183';
const { app } = await buildApp({
  paymentConfig: {
    ...testPaymentConfig,
    successUrl: `${origin}/play/payments`,
    cancelUrl: `${origin}/play/payments`,
    vnpay: {
      ...testPaymentConfig.vnpay!,
      returnUrl: `${origin}/play/payments`,
    },
  },
  paymentFetch: async () => {
    throw new Error(
      'External gateway network is intentionally blocked in browser tests',
    );
  },
});
await app.listen({ host: '127.0.0.1', port: 3012 });
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
