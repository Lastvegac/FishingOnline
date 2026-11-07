import { expect, type Page } from '@playwright/test';

export async function checkUi(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: '', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: '', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('alert').filter({ hasText: 'Chưa thể tải dữ liệu' }),
  ).toHaveCount(0);
}
