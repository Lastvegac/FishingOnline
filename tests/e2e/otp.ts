import { expect, type Page } from '@playwright/test';

// The E2E API runs with OTP_DEV_OUTBOX=true (never allowed in production), standing in for an inbox/SMS.

export async function readOtp(page: Page, to: string) {
  let code = '';
  await expect
    .poll(async () => {
      const response = await page.request.get(
        `/api/v1/dev/otp-outbox?to=${encodeURIComponent(to)}`,
      );
      if (!response.ok()) return '';
      code = (await response.json()).data.code ?? '';
      return code;
    })
    .toMatch(/^\d{6}$/);
  return code;
}

/** Waits for the OTP step, enters the latest code sent to `to` and confirms. */
export async function enterOtp(page: Page, to: string, previous?: string) {
  const input = page.locator('input[name="code"]');
  await expect(input).toBeVisible();
  let code = await readOtp(page, to);
  if (previous)
    await expect
      .poll(async () => (code = await readOtp(page, to)))
      .not.toBe(previous);
  await input.fill(code);
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  return code;
}
