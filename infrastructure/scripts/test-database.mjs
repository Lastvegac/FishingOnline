import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { e2eDatabaseUrl } from './e2e-environment.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(
  new URL('../../apps/api/package.json', import.meta.url),
);
const { Client } = require('pg');
const integration = process.argv[2]?.endsWith('-integration');
const url = integration ? process.env.TEST_DATABASE_URL : e2eDatabaseUrl;
if (!url)
  throw new Error('TEST_DATABASE_URL phải được cấu hình cho integration.');
const parsed = new URL(url);
const name = decodeURIComponent(parsed.pathname.slice(1));
// This helper must never migrate/drop an application database.
if (!/^fishing_world_(?:[a-z0-9]+_)*test$/.test(name))
  throw new Error('Database kiểm thử phải có tên fishing_world_*test.');
const adminUrl = new URL(url);
adminUrl.pathname = '/postgres';
const client = new Client({ connectionString: adminUrl.href });
await client.connect();
try {
  if (process.argv[2]?.startsWith('cleanup')) {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    console.log(`Đã xóa database kiểm thử riêng ${name}.`);
  } else {
    const exists = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );
    if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${name}"`);
    for (const command of ['db:migrate', 'db:seed']) {
      const result = spawnSync('pnpm', ['--filter', '@fwo/api', command], {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: url },
      });
      if (result.status !== 0) throw new Error(`${command} failed.`);
    }
    console.log(`Database kiểm thử sẵn sàng: ${name}`);
  }
} finally {
  await client.end();
}
