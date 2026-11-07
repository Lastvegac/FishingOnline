import { execFileSync } from 'node:child_process';

export default function setup() {
  execFileSync(
    'node',
    ['infrastructure/scripts/test-database.mjs', 'prepare'],
    { stdio: 'inherit', env: process.env },
  );
}
