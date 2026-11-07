import { expect, test, type Page } from '@playwright/test';
import { checkUi } from './ui-checks';
import { enterOtp } from './otp';

async function visitPlay(page: Page, route: string) {
  const path = route ? `/play/${route}` : '/play';
  if (route === 'equipment') {
    await page.goto(path);
    return;
  }
  if (route === 'profile') {
    await page.locator(`header a[href="${path}"]`).click();
    await expect(page).toHaveURL(path);
    return;
  }
  const menu = page.getByRole('button', { name: 'Mở thêm điều hướng' });
  if (await menu.isVisible()) {
    await menu.click();
    await page.getByRole('dialog').locator(`a[href="${path}"]`).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } else {
    await page
      .locator(`${route ? 'aside' : 'aside nav'} a[href="${path}"]`)
      .click();
  }
  await expect(page).toHaveURL(path);
}

async function register(page: Page) {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10);
  const username = `CanThu_${suffix}`;
  await page.goto('/register');
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="email"]').fill(`${suffix}@example.test`);
  await page.locator('input[name="password"]').fill('Fish123!');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản & bắt đầu' }).click();
  await enterOtp(page, `${suffix}@example.test`);
  // New accounts now complete the real shared character onboarding before the lobby.
  await page.getByRole('button', { name: 'Lưu nhân vật', exact: true }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(username);
  return username;
}

test('đăng ký, reload, responsive và câu cá thực lưu đúng một phần thưởng', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const username = await register(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(username);
  for (const route of [
    '',
    'map',
    'collection',
    'inventory',
    'equipment',
    'shop',
    'missions',
    'leaderboard',
    'profile',
    'settings',
  ]) {
    await visitPlay(page, route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      )
      .toBe(true);
    await expect(
      page.getByRole('alert').filter({ hasText: 'Chưa thể tải dữ liệu' }),
    ).toHaveCount(0);
    await checkUi(page);
    if (route === 'settings') {
      const toggle = page.getByRole('switch', { name: 'Âm thanh bên hồ' });
      const wasEnabled = (await toggle.getAttribute('aria-checked')) === 'true';
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(!wasEnabled));
      if (wasEnabled) await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
      if (testInfo.project.name === 'mobile') {
        await page.getByRole('button', { name: 'Mở thêm điều hướng' }).click();
        await page
          .getByRole('dialog')
          .getByRole('link', { name: 'Bảng xếp hạng' })
          .click();
        await expect(page).toHaveURL(/\/play\/leaderboard$/);
      }
    }
    if (route === 'inventory') {
      const trigger = page
        .getByRole('button', { name: 'Xem vật phẩm' })
        .first();
      await trigger.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
  }
  await page.goto('/play/fishing');
  await page.getByRole('button', { name: 'Mình sẵn sàng' }).click();
  await page.getByRole('button', { name: 'Chỉnh cú ném', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Hướng ném' })).toBeVisible();
  const power = page.getByRole('slider', { name: 'Lực ném' });
  await power.focus();
  await page.keyboard.press('ArrowRight');
  await expect(power).toHaveValue('0.61');
  await expect(page.getByRole('slider', { name: 'Tầng nước' })).toBeVisible();
  await page.getByRole('button', { name: /Giun.*còn lại/ }).click();
  const bait = page.getByRole('combobox', {
    name: 'Mồi cho cú thả câu tiếp theo',
  });
  await bait.focus();
  await expect(bait).toHaveCSS('outline-style', 'none');
  await expect(bait).not.toHaveCSS('box-shadow', 'none');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Chỉnh cú ném', exact: true }).click();
  await checkUi(page);
  await page.getByTestId('cast-button').click();
  await expect(page.getByTestId('hook-button')).toBeEnabled({
    timeout: 15_000,
  });
  // A valid click must survive an in-flight poll instead of being silently lost.
  let delayedRead = false;
  await page.route('**/api/v1/fishing/sessions/*', async (route) => {
    if (route.request().method() === 'GET' && !delayedRead) {
      delayedRead = true;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    await route.continue();
  });
  await expect.poll(() => delayedRead).toBe(true);
  await page.getByTestId('hook-button').click();
  await expect(page.getByTestId('reel-button')).toBeVisible();
  await page
    .getByRole('button', { name: 'Chỉnh phanh và hướng cần', exact: true })
    .click();
  await expect(
    page.getByRole('slider', { name: 'Phanh máy câu (Drag)' }),
  ).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Hướng cần' })).toBeVisible();
  await page
    .getByRole('button', { name: 'Chỉnh phanh và hướng cần', exact: true })
    .click();

  // Drive the same control a player uses. Read only the public tension gauge;
  // never force an outcome or alter server time/configuration from the browser.
  let held = false;
  const deadline = Date.now() + 50_000;
  try {
    while (
      Date.now() < deadline &&
      !(await page.getByTestId('catch-result').isVisible())
    ) {
      const meter = page.getByTestId('tension-meter');
      const value = Number(await meter.getAttribute('aria-valuenow'));
      if (!held && value < 38) {
        await page.getByTestId('reel-button').focus();
        await page.keyboard.down('Space');
        held = true;
      } else if (held && value > 72) {
        await page.keyboard.up('Space');
        held = false;
      }
      await page.waitForTimeout(180);
    }
  } finally {
    if (held) await page.keyboard.up('Space');
  }
  await expect(page.getByTestId('catch-result')).toBeVisible();
  await expect(
    page.getByTestId('catch-result').locator('canvas'),
  ).toBeVisible();
  await expect(page.getByTestId('catch-result')).toContainText('Chiều dài:');
  await page.getByRole('button', { name: 'Mở giỏ cá', exact: true }).click();
  await expect(page).toHaveURL(/\/play\/inventory\?tab=catches$/);
  await page
    .getByRole('region', { name: 'Giỏ cá đổi Gold' })
    .getByRole('button', { name: 'Đổi cá', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Xác nhận đổi/ })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/play/profile');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const persistedResponse = page.waitForResponse(
    (response) => response.url().endsWith('/users/me') && response.ok(),
  );
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Confirm persistence independently through the authenticated UI's own request.
  const response = await persistedResponse;
  const { data } = (await response.json()) as {
    data: { totalFish: number; gold: string };
  };
  expect(data.totalFish).toBe(1);
  expect(BigInt(data.gold)).toBeGreaterThan(200n);
  expect(errors).toEqual([]);
});
