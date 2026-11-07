import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { enterOtp } from './otp';
import { e2eDatabaseUrl } from '../../infrastructure/scripts/e2e-environment.mjs';
import { signVnpay } from '../../apps/api/test/payment-fixtures.js';
import { checkUi } from './ui-checks';

test.skip(
  process.env.FWO_PAYMENT_E2E !== 'true',
  'Use playwright.payments.config.ts with its isolated provider harness.',
);
const require = createRequire(
  new URL('../../apps/api/package.json', import.meta.url),
);
const { Client } = require('pg');
test('shop → signed IPN → inventory immediately, reload/reconnect and payment admin', async ({
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8),
    email = `pay-browser-${suffix}@example.test`,
    password = `Payment-browser-${suffix}-123`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/register');
  await page.locator('[name="username"]').fill(`PayBrowser_${suffix}`);
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản & bắt đầu' }).click();
  const verified = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/v1/auth/register/verify',
  );
  await enterOtp(page, email);
  const session = (await (await verified).json()).data;
  // Character onboarding is a separate feature; prepare its prerequisite via its real API.
  const actorHeaders = {
    authorization: `Bearer ${session.accessToken}`,
    'idempotency-key': crypto.randomUUID(),
  };
  const characterCatalog = await page.request.get(
    '/api/v1/characters/catalog',
    { headers: actorHeaders },
  );
  const preset = (await characterCatalog.json()).data.presets[0];
  const character = await page.request.put('/api/v1/characters/me', {
    headers: actorHeaders,
    data: {
      expectedVersion: 0,
      name: `PayBrowser_${suffix}`,
      presetId: preset.id,
      appearance: preset.appearance,
      equipment: preset.equipment,
    },
  });
  expect(character.ok()).toBe(true);
  await test.step('catalog loading, recoverable error, empty and disabled states', async () => {
    let releaseCatalog!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseCatalog = resolve;
    });
    let state: 'error' | 'empty' | 'disabled' = 'error';
    await page.route('**/api/v1/payments/catalog', async (route) => {
      await gate;
      await route.fulfill(
        state === 'error'
          ? {
              status: 503,
              json: {
                error: {
                  code: 'GATEWAY_UNAVAILABLE',
                  message: 'Catalog temporarily unavailable',
                },
              },
            }
          : {
              json: {
                data: {
                  environment: state === 'disabled' ? 'disabled' : 'sandbox',
                  methods: state === 'disabled' ? [] : ['VNPAY'],
                  items: [],
                },
              },
            },
      );
    });
    const section = page
      .locator('section')
      .filter({
        has: page.getByRole('heading', { name: 'Gói vật phẩm', exact: true }),
      });
    try {
      await page.goto('/play/shop');
      await expect(section.getByRole('status')).toBeVisible();
    } finally {
      releaseCatalog();
    }
    await expect(section.getByRole('alert')).toContainText(
      'Chưa thể tải dữ liệu',
    );
    state = 'empty';
    await section.getByRole('button', { name: 'Thử lại' }).click();
    await expect(
      section.getByText('Chưa có gói vật phẩm đang bán.'),
    ).toBeVisible();
    await checkUi(page);
    state = 'disabled';
    await page.reload();
    await expect(
      section.getByText(
        'Thanh toán đang được chuẩn bị. Bạn vẫn có thể mua vật phẩm bằng Gold.',
      ),
    ).toBeVisible();
    await checkUi(page);
    await page.unroute('**/api/v1/payments/catalog');
  });
  if (new URL(e2eDatabaseUrl).pathname !== '/fishing_world_payments_e2e_test')
    throw new Error('Only the dedicated payments E2E DB may be bootstrapped.');
  const db = new Client({ connectionString: e2eDatabaseUrl });
  await db.connect();
  let baitId: string;
  try {
    const result = await db.query(
      'SELECT id FROM users WHERE email_normalized = $1',
      [email],
    );
    await db.query(
      "INSERT INTO admin_users(id,user_id,role,version,mfa_enabled,created_at,updated_at) VALUES($1,$2,'SUPER_ADMIN',1,false,now(),now())",
      [crypto.randomUUID(), result.rows[0].id],
    );
    const bait = await db.query(
      "SELECT id FROM bait_types WHERE slug = 'worm'",
    );
    baitId = bait.rows[0].id;
  } finally {
    await db.end();
  }
  // Create the VND catalog through the audited administration UI.
  await page.goto('http://127.0.0.1:4184/login');
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Vào phòng điều hành' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4184/');
  await page.goto('http://127.0.0.1:4184/payments');
  await page.getByRole('button', { name: 'Thêm gói vật phẩm' }).click();
  const editor = page.getByRole('dialog');
  const productName = `Gói mồi thử ${suffix}`;
  await editor.locator('[name="name"]').fill(productName);
  await editor.locator('[name="description"]').fill('10 mồi giun để đi câu.');
  await editor.locator('[name="amountVnd"]').fill('10000');
  await editor
    .locator('[name="items"]')
    .fill(JSON.stringify([{ itemId: baitId, kind: 'BAIT', quantity: 10 }]));
  await editor.getByRole('checkbox').check();
  await editor.locator('[name="reason"]').fill('Browser sandbox catalog test');
  await editor.getByRole('button', { name: 'Lưu gói' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.goto('http://127.0.0.1:4183/play/shop');
  const product = page
    .locator('.fwo-card')
    .filter({ has: page.getByRole('heading', { name: productName }) });
  await product.getByRole('button', { name: 'Mua ngay' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('[name="quantity"]').fill('');
  await dialog.getByRole('button', { name: 'Tạo đơn thanh toán' }).click();
  await expect(dialog.locator('[name="quantity"]')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await dialog.locator('[name="quantity"]').fill('2');
  await dialog.locator('[name="method"]').selectOption('ATM');
  await dialog.getByRole('button', { name: 'Tạo đơn thanh toán' }).click();
  await expect(page).toHaveURL(/\/play\/payments\?order=/);
  const orderId = new URL(page.url()).searchParams.get('order')!;
  await expect(
    page.getByText('20.000 ₫', { exact: true }).first(),
  ).toBeVisible();
  await checkUi(page);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Đến trang thanh toán' }),
  ).toBeVisible();
  const db2 = new Client({ connectionString: e2eDatabaseUrl });
  await db2.connect();
  let code: string;
  try {
    code = (
      await db2.query('SELECT order_code FROM payment_orders WHERE id = $1', [
        orderId,
      ])
    ).rows[0].order_code;
  } finally {
    await db2.end();
  }
  const payload = signVnpay({
    vnp_TmnCode: 'TESTTMN1',
    vnp_TxnRef: code,
    vnp_Amount: '2000000',
    vnp_TransactionNo: String(Date.now()),
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
  });
  const response = await page.request.get(
    `/api/v1/payments/webhooks/vnpay?${new URLSearchParams(payload)}`,
  );
  expect((await response.json()).RspCode).toBe('00');
  const success = page.getByRole('dialog', { name: 'THANH TOÁN THÀNH CÔNG!' });
  await expect(success).toBeVisible({ timeout: 15000 });
  await expect(
    success.getByText('Vật phẩm đã được thêm vào kho đồ của bạn.'),
  ).toBeVisible();
  await success.getByRole('button', { name: 'TRANG BỊ NGAY' }).click();
  await expect(page).toHaveURL(/\/play\/inventory/);
  await expect(
    page.getByText('Số lượng: 40', { exact: true }).first(),
  ).toBeVisible();
  await checkUi(page);
  const duplicate = await page.request.get(
    `/api/v1/payments/webhooks/vnpay?${new URLSearchParams(payload)}`,
  );
  expect((await duplicate.json()).RspCode).toBe('02');
  await page.reload();
  await expect(
    page.getByText('Số lượng: 40', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'THANH TOÁN THÀNH CÔNG!' }),
  ).toHaveCount(0);
  await page.goto('http://127.0.0.1:4184/payments');
  const row = page.getByRole('row').filter({ hasText: code });
  await row.getByRole('button', { name: 'Chi tiết đơn thanh toán' }).click();
  await expect(
    page.getByRole('dialog').getByText('Đã thanh toán', { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('heading', { name: 'Lịch sử cấp vật phẩm' }),
  ).toBeVisible();
  await checkUi(page);
  expect(errors).toEqual([]);
});
