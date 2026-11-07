import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { enterOtp } from './otp';
import { e2eDatabaseUrl } from '../../infrastructure/scripts/e2e-environment.mjs';
import { checkUi } from './ui-checks';

const adminOrigin = process.env.FWO_E2E_ADMIN_ORIGIN ?? 'http://127.0.0.1:4174';
const require = createRequire(
  new URL('../../apps/api/package.json', import.meta.url),
);
const { Client } = require('pg');

async function promoteOnlyIsolatedTestUser(email: string) {
  const parsed = new URL(e2eDatabaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.slice(1));
  // A test must never grant privileges in an application or production database.
  if (
    !databaseName.endsWith('_test') ||
    !/^fishing_world_(?:[a-z0-9]+_)*test$/.test(databaseName)
  ) {
    throw new Error(
      'Admin E2E chỉ được phép thay đổi database fishing_world_*_test.',
    );
  }
  const client = new Client({ connectionString: e2eDatabaseUrl });
  await client.connect();
  try {
    const result = (await client.query(
      'SELECT id FROM users WHERE email_normalized = $1',
      [email],
    )) as {
      rows: Array<{ id: string }>;
    };
    expect(result.rows).toHaveLength(1);
    await client.query(
      `INSERT INTO admin_users (id, user_id, role, version, mfa_enabled, created_at, updated_at)
       VALUES ($1, $2, 'SUPER_ADMIN', 1, false, now(), now())`,
      [crypto.randomUUID(), result.rows[0].id],
    );
  } finally {
    await client.end();
  }
}

test('quản trị đăng nhập, xem người chơi và sửa nội dung có audit log', async ({
  page,
}) => {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10);
  const username = `NguoiGiuHo_${suffix}`;
  const email = `${suffix}@example.test`;
  const password = `Fishing-Admin-Test-${suffix}-123!`;
  const reason = `E2E content review ${suffix}`;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // The account itself is registered through the public UI. Only the isolated
  // test database bootstrap grants the role; the browser has no promotion API.
  await page.goto('/register');
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản & bắt đầu' }).click();
  await enterOtp(page, email);
  await expect(page).toHaveURL(/\/play$/);
  await promoteOnlyIsolatedTestUser(email);

  // The registration refresh cookie is shared by local origins. Restore once,
  // then sign out so this regression still exercises the admin login form.
  await page.goto(`${adminOrigin}/`);
  await page.getByRole('button', { name: 'Đăng xuất quản trị' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Chào người giữ hồ.',
  );
  await page.getByLabel('Email', { exact: false }).fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Vào phòng điều hành' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Hồ hôm nay thế nào?',
  );
  await expect(page.getByText('SUPER_ADMIN', { exact: true })).toBeAttached();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Chưa thể tải dữ liệu' }),
  ).toHaveCount(0);
  for (const route of [
    '',
    'data/fish',
    'data/locations',
    'data/equipment',
    'data/baits',
    'data/shop-items',
    'data/missions',
    'users',
    'configs',
    'operations/wallet-transactions',
    'operations/audit-logs',
    'analytics',
  ]) {
    await page.locator(`aside nav a[href="/${route}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.fwo-loading')).toHaveCount(0);
    await checkUi(page);
  }

  await page.goto(`${adminOrigin}/users`);
  await expect(
    page.getByRole('row').filter({ hasText: username }),
  ).toContainText('SUPER_ADMIN');

  await page.goto(`${adminOrigin}/data/fish`);
  const carp = page.getByRole('row').filter({ hasText: 'Cá chép' });
  await carp.getByRole('button', { name: 'Chỉnh sửa' }).click();
  const editor = page.getByRole('dialog');
  const description = editor.getByLabel('Mô tả', { exact: true });
  await expect(
    editor.getByRole('button', { name: 'Lưu & ghi nhật ký' }),
  ).toBeInViewport();
  const originalDescription = await description.inputValue();
  await editor.getByRole('button', { name: 'Lưu & ghi nhật ký' }).click();
  await expect(
    editor.getByLabel('Lý do thay đổi', { exact: false }),
  ).toHaveAttribute('aria-invalid', 'true');
  await expect(
    editor.getByText('Vui lòng nhập lý do thay đổi.', { exact: true }),
  ).toBeVisible();
  const reviewedDescription = `${originalDescription} [Review ${suffix}]`;
  await description.fill(reviewedDescription);
  await editor.getByLabel('Lý do thay đổi', { exact: false }).fill(reason);
  const patchResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/admin/fish/'),
  );
  await editor.getByRole('button', { name: 'Lưu & ghi nhật ký' }).click();
  const saved = await patchResponse;
  expect(saved.ok()).toBe(true);
  const savedBody = (await saved.json()) as {
    data: { auditId: string; configVersion: number };
  };
  expect(savedBody.data.auditId).toMatch(/^[\da-f-]{36}$/i);
  expect(savedBody.data.configVersion).toBeGreaterThan(1);
  await expect(editor).not.toBeVisible();

  // Read back through the editor and restore only the description changed by
  // this test. Audit history is preserved; the test does not alter game odds.
  await carp.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await expect(description).toHaveValue(reviewedDescription);
  await description.fill(originalDescription);
  await editor
    .getByLabel('Lý do thay đổi', { exact: false })
    .fill(`Restore reviewed description ${suffix}`);
  await editor.getByRole('button', { name: 'Lưu & ghi nhật ký' }).click();
  await expect(editor).not.toBeVisible();

  await page.goto(`${adminOrigin}/operations/audit-logs`);
  const auditEntry = page.getByRole('row').filter({ hasText: reason });
  await expect(auditEntry).toContainText('Cập nhật nội dung game');
  await auditEntry.getByRole('button', { name: 'Chi tiết' }).click();
  await expect(page.getByRole('dialog')).toContainText(reviewedDescription);
  await expect(page.getByRole('dialog')).toContainText(savedBody.data.auditId);
  expect(errors).toEqual([]);
});
