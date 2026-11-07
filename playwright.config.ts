import { defineConfig, devices } from '@playwright/test';
import { e2eDatabaseUrl } from './infrastructure/scripts/e2e-environment.mjs';

const databaseUrl = e2eDatabaseUrl;
const origin = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  globalSetup: './tests/e2e/setup.ts',
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Headless Chromium needs software WebGL so the three.js scenes really render.
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
      command: 'pnpm --filter @fwo/api exec tsx src/server.ts',
      url: 'http://127.0.0.1:3002/health',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
        PORT: '3002',
        HOST: '127.0.0.1',
        JWT_SECRET: 'e2e-only-ephemeral-secret-replace-in-production-7890',
        ALLOWED_ORIGINS: `${origin},http://127.0.0.1:4174`,
        WEB_ORIGIN: origin,
        REDIS_URL: '',
        // In-memory OTP outbox for email/SMS codes; the API refuses this flag in production.
        OTP_DEV_OUTBOX: 'true',
      },
    },
    {
      command:
        'pnpm --filter @fwo/web dev --host 127.0.0.1 --port 4173 --strictPort',
      url: origin,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_TARGET: 'http://127.0.0.1:3002' },
    },
    {
      command:
        'pnpm --filter @fwo/admin dev --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_TARGET: 'http://127.0.0.1:3002' },
    },
  ],
});
