import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { diamondCurrencyItemId } from '@fwo/contracts';
import {
  DEFAULT_CONFIG,
  gameConfigSchema,
  LAUNCH_PRICING_ID,
  LAUNCH_COSMETIC_PRICES,
  LAUNCH_DIAMOND_PACKS,
} from '@fwo/game-config';
import type { GameConfig } from '@fwo/game-config';
import type { Tx } from '../db.js';
import { json, plain } from '../db.js';
import { assert } from '../lib/errors.js';
import { activateConfiguration } from '../modules/admin/config.js';

/** Operator-run price publication. Never changes balances, entitlements or order/session snapshots. */
export async function launchPricing(
  tx: Tx,
  input: {
    apply: boolean;
    expectedVersion?: number;
    reason: string;
    now: number;
  },
) {
  assert(input.reason.trim().length >= 5, 422, 'REASON_REQUIRED');
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:game-config'))`;
  // Shared with fashion/payment admin row updates: serialize edits before comparing versions.
  await tx.$queryRaw`SELECT id FROM character_cosmetics ORDER BY id FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM payment_products ORDER BY id FOR UPDATE`;
  const active = await tx.systemConfig.findFirstOrThrow({
    where: { key: 'game', isActive: true },
  });
  assert(
    input.expectedVersion === undefined ||
      active.version === input.expectedVersion,
    409,
    'VERSION_CONFLICT',
  );
  const current = active.value as unknown as GameConfig;
  const desired = new Map(DEFAULT_CONFIG.shop.map((item) => [item.id, item]));
  const shopChanges = current.shop.flatMap((item) => {
    const target = desired.get(item.id);
    if (
      !target ||
      (item.priceGold === target.priceGold &&
        item.sellPriceGold === target.sellPriceGold)
    )
      return [];
    return [
      {
        id: item.id,
        name: item.name,
        before: {
          priceGold: item.priceGold,
          sellPriceGold: item.sellPriceGold ?? null,
        },
        after: {
          priceGold: target.priceGold,
          sellPriceGold: target.sellPriceGold ?? null,
        },
      },
    ];
  });
  const cosmetics = await tx.characterCosmetic.findMany({
    orderBy: { id: 'asc' },
  });
  const cosmeticChanges = cosmetics.flatMap((item) => {
    const target = LAUNCH_COSMETIC_PRICES[item.id];
    // Free and level-earned cosmetics stay available without a purchase.
    if (!target || ['FREE', 'LEVEL'].includes(item.unlockType)) return [];
    const before = {
      unlockType: item.unlockType,
      priceGold: item.priceGold.toString(),
      priceDiamonds: item.priceDiamonds.toString(),
    };
    const after = {
      unlockType: target.currency,
      priceGold: target.currency === 'GOLD' ? target.price : '0',
      priceDiamonds: target.currency === 'DIAMOND' ? target.price : '0',
    };
    return isDeepStrictEqual(before, after)
      ? []
      : [{ id: item.id, version: item.version, before, after }];
  });
  const products = await tx.paymentProduct.findMany({
    where: { id: { in: LAUNCH_DIAMOND_PACKS.map((p) => p.id) } },
  });
  const productChanges = LAUNCH_DIAMOND_PACKS.flatMap((pack) => {
    const row = products.find((p) => p.id === pack.id);
    const before = row
      ? {
          name: row.name,
          description: row.description,
          amountVnd: row.amountVnd.toString(),
          active: row.active,
          items: row.items,
        }
      : null;
    const after = {
      name: pack.name,
      description: pack.description,
      amountVnd: pack.amountVnd,
      active: row?.active ?? true,
      items: [
        {
          itemId: diamondCurrencyItemId,
          kind: 'DIAMOND',
          quantity: pack.diamonds,
        },
      ],
    };
    return isDeepStrictEqual(plain(before), after)
      ? []
      : [{ id: pack.id, version: row?.version ?? 0, before, after }];
  });
  const plan = {
    policy: LAUNCH_PRICING_ID,
    activeVersion: active.version,
    shopChanges,
    cosmeticChanges,
    productChanges,
  };
  if (
    !input.apply ||
    (!shopChanges.length && !cosmeticChanges.length && !productChanges.length)
  )
    return { ...plan, applied: false };
  let publishedVersion = active.version;
  if (shopChanges.length) {
    const latest = await tx.systemConfig.aggregate({
      where: { key: 'game' },
      _max: { version: true },
    });
    const changes = new Map(shopChanges.map((c) => [c.id, c.after]));
    const next = gameConfigSchema.parse({
      ...current,
      version: (latest._max.version ?? active.version) + 1,
      shop: current.shop.map((item) => {
        const price = changes.get(item.id);
        if (!price) return item;
        const { sellPriceGold: _priorSell, ...rest } = item;
        return {
          ...rest,
          priceGold: price.priceGold,
          ...(price.sellPriceGold === null
            ? {}
            : { sellPriceGold: price.sellPriceGold }),
        };
      }),
    });
    await activateConfiguration(tx, next, input.now);
    publishedVersion = next.version;
  }
  for (const change of cosmeticChanges) {
    const result = await tx.characterCosmetic.updateMany({
      where: { id: change.id, version: change.version },
      data: {
        ...change.after,
        priceGold: BigInt(change.after.priceGold),
        priceDiamonds: BigInt(change.after.priceDiamonds),
        version: { increment: 1 },
      },
    });
    assert(result.count === 1, 409, 'VERSION_CONFLICT');
  }
  for (const change of productChanges) {
    const data = {
      ...change.after,
      amountVnd: BigInt(change.after.amountVnd),
      items: json(change.after.items),
      updatedAt: new Date(input.now),
    };
    if (!change.before)
      await tx.paymentProduct.create({ data: { id: change.id, ...data } });
    else {
      const result = await tx.paymentProduct.updateMany({
        where: { id: change.id, version: change.version },
        data: { ...data, version: { increment: 1 } },
      });
      assert(result.count === 1, 409, 'VERSION_CONFLICT');
    }
  }
  await tx.auditLog.create({
    data: {
      actorSnapshot: { type: 'OPERATOR_CLI', policy: LAUNCH_PRICING_ID },
      action: 'APPLY_LAUNCH_PRICING',
      targetType: 'PricingProfile',
      targetId: LAUNCH_PRICING_ID,
      before: json(plan),
      after: { publishedVersion },
      reason: input.reason,
      requestId: randomUUID(),
      createdAt: new Date(input.now),
    },
  });
  return { ...plan, applied: true, publishedVersion };
}
