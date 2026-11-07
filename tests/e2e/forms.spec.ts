import { expect, test } from '@playwright/test';

test('validation inline, password 8 ký tự và lỗi server đúng ô nhập', async ({
  page,
}) => {
  let submitted = 0;
  await page.route('**/api/v1/auth/register', async (route) => {
    submitted++;
    expect(route.request().postDataJSON().password).toBe('Fish123!');
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'ALREADY_EXISTS',
          message: 'Dữ liệu đã tồn tại.',
          fields: {
            email: ['Email này đã được sử dụng.'],
            username: ['Tên cần thủ này đã được sử dụng.'],
          },
        },
      }),
    });
  });
  await page.goto('/register');
  const username = page.getByRole('textbox', { name: 'Tên cần thủ' });
  const email = page.getByRole('textbox', { name: 'Địa chỉ email' });
  const password = page.locator('input[name="password"]');
  const consent = page.getByRole('checkbox');
  const submit = page.getByRole('button', { name: 'Tạo tài khoản & bắt đầu' });
  await submit.click();
  for (const input of [username, email, password, consent])
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(username).toBeFocused();
  await expect(
    page.getByText('Vui lòng nhập tên cần thủ.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Vui lòng chọn điều khoản sử dụng.', { exact: true }),
  ).toBeVisible();
  expect(submitted).toBe(0);
  await username.fill('CanThu_Valid');
  await email.fill('invalid-email');
  await password.fill('1234567');
  await consent.check();
  await submit.click();
  await expect(
    page.getByText('Vui lòng nhập địa chỉ email hợp lệ.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Mật khẩu phải có ít nhất 8 ký tự.', { exact: true }),
  ).toBeVisible();
  expect(submitted).toBe(0);
  await email.fill('angler@example.test');
  await password.fill('Fish123!');
  await expect(password).toHaveAttribute('aria-invalid', 'false');
  await submit.click();
  await expect(
    page.getByText('Email này đã được sử dụng.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Tên cần thủ này đã được sử dụng.', { exact: true }),
  ).toBeVisible();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  const colors = await email.evaluate((input) => {
    const sample = document.createElement('span');
    sample.style.color = 'var(--color-error)';
    document.body.append(sample);
    const expected = getComputedStyle(sample).color;
    sample.remove();
    return { border: getComputedStyle(input).borderColor, expected };
  });
  await expect(email).toHaveCSS('border-color', colors.expected);
  await email.fill('another@example.test');
  await expect(
    page.getByText('Email này đã được sử dụng.', { exact: true }),
  ).toHaveCount(0);
  await expect(email).toHaveAttribute('aria-invalid', 'false');
  expect(submitted).toBe(1);
});
