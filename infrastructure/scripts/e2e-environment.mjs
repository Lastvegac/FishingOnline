import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Match local API credentials, while preserving explicit CI/shell overrides.
const envFile = fileURLToPath(new URL('../../apps/api/.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const application = new URL(
  process.env.DATABASE_URL ?? 'postgresql://fwo@127.0.0.1:55432/fishing_world',
);
application.pathname = '/fishing_world_e2e_test';
export const e2eDatabaseUrl = process.env.E2E_DATABASE_URL ?? application.href;
