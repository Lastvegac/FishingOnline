import { expect, test } from '@playwright/test';
import { checkUi } from './ui-checks';

test.use({ reducedMotion: 'reduce' });

test('shared controls: focus, icon, modal scroll, keyboard và mobile menu', async ({
  page,
}, testInfo) => {
  await page.context().addCookies([
    {
      name: 'fwo-csrf',
      value: 'mock-ui-csrf',
      domain: '127.0.0.1',
      path: '/',
    },
  ]);
  const player = {
    id: 'layout-player',
    email: 'layout@example.test',
    username: 'CanThuLayout',
    avatarKey: 'angler-1',
    level: 1,
    totalXp: 0,
    gold: '200',
    totalFish: 1,
    largestFishG: 300,
    createdAt: '2026-11-07T00:00:00Z',
    role: 'SUPER_ADMIN',
  };
  const rod = {
    id: 'rod-1',
    name: 'Cần gỗ',
    kind: 'ROD',
    slot: 'ROD',
    quantity: 1,
    upgradeLevel: 0,
    equipped: true,
    power: 4,
    control: 4,
    minLevel: 1,
    upgradeCostGold: '100',
  };
  const baits = ['Giun đất', 'Ngô ngọt'].map((name, i) => ({
    id: `bait-${i}`,
    name,
    kind: 'BAIT',
    quantity: 20,
    upgradeLevel: 0,
    equipped: false,
    power: 0,
    control: 0,
    minLevel: 1,
  }));
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/characters/me'))
      return route.fulfill({
        json: {
          data: {
            id: '00000000-0000-4000-8000-000000009999',
            name: 'CanThuLayout',
            presetId: 'elder',
            version: 1,
            appearance: {
              gender: 'MALE',
              ageGroup: 'ELDER',
              face: {
                shape: 'WEATHERED',
                eyes: 'WEATHERED',
                eyebrows: 'WEATHERED',
                nose: 'WEATHERED',
                mouth: 'WEATHERED',
                skin: 'WARM',
                wrinkles: 0.8,
                beard: 'LONG',
                mark: 'NONE',
              },
              hairColor: 'SILVER',
              body: { height: 1, build: 1, posture: 'RELAXED' },
              clothColor: 'IVORY',
              fishingStyle: 'SEATED',
              dyes: {},
              pattern: 'PLAIN',
              fabric: 'LINEN',
              trimColor: 'GOLD',
            },
            equipment: {
              HEADWEAR: 'hat-bamboo',
              HAIR: 'hair-bun',
              UPPER: 'elder-upper',
              LOWER: 'elder-lower',
              SHOES: 'shoes-cloth',
              BELT: 'belt-cloth',
              FACE_ACCESSORY: 'gourd',
              OUTERWEAR: null,
              NECKLACE: null,
              WRIST: null,
              HANDHELD: null,
              BACK: 'fish-basket',
            },
            updatedAt: '2026-11-07T00:00:00Z',
          },
        },
      });
    const data = path.endsWith('/auth/refresh')
      ? { accessToken: 'mock-ui-session' }
      : path.endsWith('/users/me')
        ? player
        : path.endsWith('/inventory')
          ? { items: [rod, ...baits], equipped: { ROD: rod.id } }
          : path.endsWith('/fishing/sessions/active')
            ? null
            : path.endsWith('/admin/fish')
              ? {
                  items: [
                    {
                      id: 'fish-1',
                      name: 'Cá chép',
                      rarity: 'COMMON',
                      description: 'Một loài cá quen thuộc.',
                      minWeightG: 100,
                      baseWeightG: 300,
                      maxWeightG: 1000,
                      spawnWeight: 10,
                      baseRewardGold: 5,
                      baseXp: 5,
                      difficulty: 1,
                      active: true,
                      version: 1,
                    },
                  ],
                  configVersion: 1,
                }
              : { items: [], resetAt: '2026-11-08T00:00:00Z' };
    return route.fulfill({ json: { data } });
  });
  await page.goto('/play/fishing');
  await page.getByRole('button', { name: /Giun đất.*còn lại/ }).click();
  const bait = page.getByRole('combobox', {
    name: 'Mồi cho cú thả câu tiếp theo',
  });
  await expect(bait).toBeEnabled({ timeout: 20_000 });
  await bait.focus();
  await expect(bait).toHaveCSS('outline-style', 'none');
  await expect(bait).not.toHaveCSS('box-shadow', 'none');
  await bait.selectOption('bait-1');
  await expect(bait).toHaveValue('bait-1');
  await page.keyboard.press('Escape');
  await checkUi(page);

  await page.goto('/play/inventory');
  const trigger = page.getByRole('button', { name: 'Xem vật phẩm' }).first();
  await trigger.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Nâng cấp/ })
    .click();
  await expect(page.locator('dialog[open]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /Nâng cấp/ }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await page.goto('/play/profile');
  const avatar = page.getByRole('button', { name: 'Ảnh đại diện 2' });
  await avatar.click();
  await expect(avatar).toHaveAttribute('aria-pressed', 'true');
  expect(
    await avatar
      .locator('svg')
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(20);
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Mở thêm điều hướng' }).click();
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'Cài đặt', exact: true })
      .click();
    await expect(page).toHaveURL(/\/play\/settings$/);
    const toggle = page.getByRole('switch', { name: 'Âm thanh bên hồ' });
    const wasEnabled = (await toggle.getAttribute('aria-checked')) === 'true';
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', String(!wasEnabled));
  }

  const admin = process.env.FWO_E2E_ADMIN_ORIGIN ?? 'http://127.0.0.1:4174';
  await page.goto(`${admin}/data/fish`);
  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  const dialog = page.getByRole('dialog');
  const save = dialog.getByRole('button', { name: 'Lưu & ghi nhật ký' });
  await expect(save).toBeInViewport();
  await dialog
    .getByLabel('Lý do thay đổi', { exact: false })
    .scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await save.click();
  await expect(
    dialog.getByLabel('Lý do thay đổi', { exact: false }),
  ).toHaveAttribute('aria-invalid', 'true');
  await checkUi(page);
});
