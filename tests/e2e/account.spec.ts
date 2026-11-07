import { expect, test } from '@playwright/test';
import { enterOtp } from './otp';

test('đăng ký bằng số điện thoại qua OTP, đổi tên/avatar phải nhập mã, không sửa được số/email', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 8);
  const digits = String(Number.parseInt(suffix, 16) % 1e8).padStart(8, '0');
  const local = `09${digits}`;
  const e164 = `+849${digits}`;
  const username = `Phone_${suffix}`;

  await page.goto('/register');
  await page.getByRole('button', { name: 'Số điện thoại', exact: true }).click();
  await page.locator('input[name="username"]').fill(username);
  const phone = page.locator('input[name="phone"]');
  await phone.fill('0212');
  await page.locator('input[name="password"]').fill('Fish123!');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản & bắt đầu' }).click();
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await phone.fill(local);
  await page.getByRole('button', { name: 'Tạo tài khoản & bắt đầu' }).click();
  await expect(page.getByText(/Mã 6 số đã được gửi tới \+84/)).toBeVisible();
  // A wrong code stays on the step with an inline field error.
  await page.locator('input[name="code"]').fill('000000');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  const signupCode = await enterOtp(page, e164);
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(username);

  await page.goto('/play/profile');
  await expect(page.locator('input[type="tel"]')).toBeDisabled();
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  const renamed = `Doi_${suffix}`;
  await page.locator('input[name="username"]').fill(renamed);
  await page.getByRole('button', { name: 'Avatar 3' }).click();
  await page.getByRole('button', { name: /Lưu thay đổi/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await enterOtp(page, e164, signupCode);
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: renamed })).toBeVisible();
  await page.reload();
  await expect(page.locator('input[name="username"]')).toHaveValue(renamed);
  expect(errors).toEqual([]);
});
