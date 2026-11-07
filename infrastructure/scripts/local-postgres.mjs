import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const data = join(root, '.local/postgres');
const log = join(root, '.local/postgres.log');
const port = process.env.LOCAL_PG_PORT ?? '55432';
if (!/^\d{4,5}$/.test(port))
  throw new Error('LOCAL_PG_PORT phải là một cổng hợp lệ.');
const action = process.argv[2] ?? 'start';
const run = (command, args, quiet = false) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (result.error)
    throw new Error(
      `Cần PostgreSQL tools (${command}) trong PATH. Dùng Docker Compose nếu chưa cài PostgreSQL.`,
      { cause: result.error },
    );
  return result;
};
const isRunning = () =>
  existsSync(join(data, 'PG_VERSION')) &&
  run('pg_ctl', ['-D', data, 'status'], true).status === 0;
if (action === 'stop') {
  if (
    isRunning() &&
    run('pg_ctl', ['-D', data, 'stop', '-m', 'fast', '-w']).status !== 0
  )
    process.exit(1);
  console.log(
    'Đã dừng PostgreSQL local. Dữ liệu ứng dụng được giữ trong .local/postgres.',
  );
} else if (action === 'status') {
  console.log(
    isRunning()
      ? `PostgreSQL local đang chạy tại 127.0.0.1:${port}`
      : 'PostgreSQL local đang dừng.',
  );
} else if (action === 'start') {
  mkdirSync(dirname(data), { recursive: true, mode: 0o700 });
  if (
    !existsSync(join(data, 'PG_VERSION')) &&
    run('initdb', [
      '-D',
      data,
      '-U',
      'fwo',
      '-A',
      'trust',
      '--encoding=UTF8',
      '--locale=C',
    ]).status !== 0
  )
    process.exit(1);
  // Development only: trust is confined to localhost. Production uses Docker secrets/passwords.
  if (
    !isRunning() &&
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      log,
      '-o',
      `-p ${port} -h 127.0.0.1`,
      'start',
      '-w',
    ]).status !== 0
  )
    process.exit(1);
  const args = ['-h', '127.0.0.1', '-p', port, '-U', 'fwo'];
  for (const name of ['fishing_world', 'fishing_world_test']) {
    const result = run(
      'psql',
      [
        ...args,
        '-d',
        'postgres',
        '-tAc',
        `SELECT 1 FROM pg_database WHERE datname = '${name}'`,
      ],
      true,
    );
    if (result.status !== 0)
      throw new Error('Không thể đọc danh sách database local.');
    if (
      result.stdout.trim() !== '1' &&
      run('createdb', [...args, name]).status !== 0
    )
      process.exit(1);
  }
  console.log(`DATABASE_URL=postgresql://fwo@127.0.0.1:${port}/fishing_world`);
  console.log(
    `TEST_DATABASE_URL=postgresql://fwo@127.0.0.1:${port}/fishing_world_test`,
  );
} else {
  throw new Error('Usage: pnpm services:local [start|stop|status]');
}
