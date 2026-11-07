import 'dotenv/config';
import { parseArgs } from 'node:util';
import { createDatabase } from './db.js';
import { launchPricing } from './operations/launch-pricing.js';

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    'expected-version': { type: 'string' },
    reason: { type: 'string', default: 'Review acquisition launch pricing' },
  },
});
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(databaseUrl).hostname)
)
  throw new Error('This operator CLI only publishes to a local database');
const expectedVersion =
  values['expected-version'] === undefined
    ? undefined
    : Number(values['expected-version']);
if (
  values.apply &&
  (!Number.isSafeInteger(expectedVersion) || expectedVersion! < 1)
)
  throw new Error('--apply requires --expected-version from a current preview');
const db = createDatabase(databaseUrl);
try {
  const result = await db.$transaction(
    (tx) =>
      launchPricing(tx, {
        apply: values.apply,
        expectedVersion,
        reason: values.reason,
        now: Date.now(),
      }),
    { timeout: 30_000 },
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.$disconnect();
}
