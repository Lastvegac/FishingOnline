import { defineConfig, devices } from '@playwright/test';
import { e2eDatabaseUrl } from './infrastructure/scripts/e2e-environment.mjs';

if (new URL(e2eDatabaseUrl).pathname !== '/fishing_world_payments_e2e_test')
  throw new Error(
    'Set E2E_DATABASE_URL to the dedicated fishing_world_payments_e2e_test database.',
  );
process.env.FWO_PAYMENT_E2E = 'true';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'payments.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  globalSetup: './tests/e2e/setup.ts',
  outputDir: '/tmp/fwo-payments-e2e-artifacts',
  reporter: 'list',
  use: {
    actionTimeout: 20000,
    baseURL: 'http://127.0.0.1:4183',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @fwo/api exec tsx ../../tests/e2e/payment-api.ts',
      url: 'http://127.0.0.1:3012/health',
      reuseExistingServer: false,
      env: {
        DATABASE_URL: e2eDatabaseUrl,
        NODE_ENV: 'test',
        JWT_SECRET: 'payment-browser-test-only-secret-at-least-32-characters',
        ALLOWED_ORIGINS: 'http://127.0.0.1:4183,http://127.0.0.1:4184',
        WEB_ORIGIN: 'http://127.0.0.1:4183',
        REDIS_URL: '',
        OTP_DEV_OUTBOX: 'true',
        PAYMENT_ENVIRONMENT: 'disabled',
      },
    },
    {
      command:
        'rtk proxy pnpm --filter @fwo/web exec vite build --outDir /tmp/fwo-payments-web-build --emptyOutDir && rtk proxy pnpm --filter @fwo/web exec vite preview --outDir /tmp/fwo-payments-web-build --host 127.0.0.1 --port 4183 --strictPort',
      url: 'http://127.0.0.1:4183',
      reuseExistingServer: false,
      env: { VITE_API_TARGET: 'http://127.0.0.1:3012' },
    },
    {
      command:
        'rtk proxy pnpm --filter @fwo/admin exec vite build --outDir /tmp/fwo-payments-admin-build --emptyOutDir && rtk proxy pnpm --filter @fwo/admin exec vite preview --outDir /tmp/fwo-payments-admin-build --host 127.0.0.1 --port 4184 --strictPort',
      url: 'http://127.0.0.1:4184',
      reuseExistingServer: false,
      env: { VITE_API_TARGET: 'http://127.0.0.1:3012' },
    },
  ],
});
