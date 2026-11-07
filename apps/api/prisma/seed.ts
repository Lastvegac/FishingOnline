import 'dotenv/config';
import {
  DEFAULT_CONFIG,
  gameConfigSchema,
  mergeMissingDefaults,
} from '@fwo/game-config';
import type { GameConfig } from '@fwo/game-config';
import { createDatabase } from '../src/db.js';
import { activateConfiguration } from '../src/modules/admin/config.js';
import { launchPricing } from '../src/operations/launch-pricing.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'DATABASE_URL is required; seed never assumes a production target.',
  );
const db = createDatabase(databaseUrl);
try {
  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:game-config'))`;
      const active = await tx.systemConfig.findFirst({
        where: { key: 'game', isActive: true },
      });
      if (active) {
        // Additive upgrade: keep live admin values, add only built-in content that is
        // missing and was never removed by an operator (still known in normalized tables).
        const live = active.value as unknown as GameConfig;
        const known = async (rows: Promise<Array<{ id: string }>>) =>
          new Set((await rows).map((row) => row.id));
        const liveIds = (entries: Array<{ id: string }>) =>
          new Set(entries.map((entry) => entry.id));
        const retired = (all: Set<string>, current: Set<string>) =>
          new Set([...all].filter((id) => !current.has(id)));
        const merged = mergeMissingDefaults(live, DEFAULT_CONFIG, {
          locations: retired(
            await known(tx.fishingLocation.findMany({ select: { id: true } })),
            liveIds(live.locations),
          ),
          shop: retired(
            await known(tx.shopItem.findMany({ select: { id: true } })),
            liveIds(live.shop),
          ),
          missions: retired(
            await known(tx.mission.findMany({ select: { id: true } })),
            liveIds(live.missions),
          ),
        });
        if (!merged) {
          console.log('Active configuration already has the built-in content.');
          return;
        }
        const latest = await tx.systemConfig.aggregate({
          where: { key: 'game' },
          _max: { version: true },
        });
        const next = gameConfigSchema.parse({
          ...merged,
          version: (latest._max.version ?? active.version) + 1,
        });
        await activateConfiguration(tx, next, Date.now());
        console.log(
          `Published configuration v${next.version} with missing built-in content (${next.fish.length} fish, ${next.locations.length} spots). Running sessions keep their snapshot.`,
        );
        return;
      }
      await activateConfiguration(tx, DEFAULT_CONFIG, Date.now());
      await launchPricing(tx, {
        apply: true,
        expectedVersion: DEFAULT_CONFIG.version,
        reason: 'Initialize acquisition prices on a new installation',
        now: Date.now(),
      });
      console.log(
        `Seeded ${DEFAULT_CONFIG.fish.length} fish, ${DEFAULT_CONFIG.locations.length} spots, equipment, bait, shop, missions and achievements. No default users/admin.`,
      );
    },
    { timeout: 30_000 },
  );
} finally {
  await db.$disconnect();
}
