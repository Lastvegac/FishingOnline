import type { GameConfig } from '@fwo/game-config';
import { gameConfigSchema } from '@fwo/game-config';
import type { Tx } from '../../db.js';
import { json } from '../../db.js';
import { assert } from '../../lib/errors.js';

/** Keep normalized configuration tables aligned with the versioned server snapshot. */
export async function syncConfiguration(tx: Tx, input: GameConfig) {
  const config = gameConfigSchema.parse(input);
  assert(config.fish.length >= 10, 422, 'MINIMUM_TEN_SPECIES');
  const soldDefinition = await tx.paymentOrderItem.findFirst({
    where: {
      kind: { not: 'DIAMOND' },
      itemId: {
        notIn: [
          ...config.equipment.map((i) => i.id),
          ...config.baits.map((i) => i.id),
        ],
      },
    },
  });
  assert(
    !soldDefinition,
    422,
    'PAYMENT_ITEM_STILL_REFERENCED',
    'Phải giữ định nghĩa vật phẩm đã có trong đơn thanh toán.',
  );
  for (const fish of config.fish) {
    const data = {
      slug: fish.slug,
      name: fish.name,
      description: fish.description,
      imageKey: fish.imageKey,
      rarity: fish.rarity,
      baseWeightG: fish.baseWeightG,
      minWeightG: fish.minWeightG,
      maxWeightG: fish.maxWeightG,
      baseRewardGold: BigInt(fish.baseRewardGold),
      baseXp: fish.baseXp,
      habitat: fish.habitat,
      preferredBaits: json(fish.preferredBaits),
      difficulty: fish.difficulty,
      pullStrength: fish.pullStrength,
      reactionMs: fish.hookWindowMs,
      active: true,
    };
    const { active: _active, ...updated } = data;
    await tx.fishSpecies.upsert({
      where: { id: fish.id },
      create: { id: fish.id, ...data },
      update: { ...updated, version: { increment: 1 } },
    });
  }
  for (const equipment of config.equipment) {
    const shop = config.shop.find((s) => s.itemId === equipment.id);
    const data = {
      slug: equipment.slug,
      name: equipment.name,
      slot: equipment.slot,
      minLevel: equipment.minLevel,
      basePriceGold: BigInt(shop?.priceGold ?? '0'),
      imageKey: equipment.imageKey,
      active: true,
    };
    const { active: _active, ...updated } = data;
    await tx.equipment.upsert({
      where: { id: equipment.id },
      create: { id: equipment.id, ...data },
      update: { ...updated, version: { increment: 1 } },
    });
    for (const key of ['power', 'control'] as const)
      await tx.equipmentStat.upsert({
        where: { equipmentId_key: { equipmentId: equipment.id, key } },
        create: { equipmentId: equipment.id, key, value: equipment[key] },
        update: { value: equipment[key] },
      });
  }
  for (const bait of config.baits) {
    const data = {
      slug: bait.slug,
      name: bait.name,
      priceGold: BigInt(
        config.shop.find((s) => s.itemId === bait.id)?.priceGold ?? '0',
      ),
      imageKey: bait.imageKey,
      attractionConfig: { minLevel: bait.minLevel },
      active: true,
    };
    const { active: _active, ...updated } = data;
    await tx.baitType.upsert({
      where: { id: bait.id },
      create: { id: bait.id, ...data },
      update: { ...updated, version: { increment: 1 } },
    });
  }
  for (const location of config.locations) {
    const data = {
      slug: location.slug,
      name: location.name,
      environment: location.environment,
      minLevel: location.minLevel,
      entryFeeGold: BigInt(location.entryFeeGold),
      difficulty: 1,
      imageKey: location.imageKey,
      assetConfig: { description: location.description },
      active: true,
    };
    const { active: _active, ...updated } = data;
    await tx.fishingLocation.upsert({
      where: { id: location.id },
      create: { id: location.id, ...data },
      update: { ...updated, version: { increment: 1 } },
    });
    await tx.locationFish.deleteMany({
      where: { locationId: location.id, fishId: { notIn: location.fishIds } },
    });
    for (const fishId of location.fishIds)
      await tx.locationFish.upsert({
        where: { locationId_fishId: { locationId: location.id, fishId } },
        create: {
          locationId: location.id,
          fishId,
          baseWeight: config.fish.find((f) => f.id === fishId)!.spawnWeight,
          conditions: {},
        },
        update: {
          baseWeight: config.fish.find((f) => f.id === fishId)!.spawnWeight,
        },
      });
  }
  await tx.shopItem.updateMany({
    where: { id: { notIn: config.shop.map((s) => s.id) } },
    data: { active: false },
  });
  for (const shop of config.shop) {
    const data = {
      equipmentId: shop.kind === 'BAIT' ? null : shop.itemId,
      baitTypeId: shop.kind === 'BAIT' ? shop.itemId : null,
      priceGold: BigInt(shop.priceGold),
      grantQuantity: shop.grantQuantity,
      minLevel: shop.minLevel,
      active: true,
    };
    const { active: _active, ...updated } = data;
    await tx.shopItem.upsert({
      where: { id: shop.id },
      create: { id: shop.id, ...data },
      update: { ...updated, version: { increment: 1 } },
    });
  }
  await tx.mission.updateMany({
    where: { id: { notIn: config.missions.map((m) => m.id) } },
    data: { active: false },
  });
  for (const mission of config.missions) {
    const data = {
      key: mission.slug,
      name: mission.name,
      eventType: mission.metric,
      target: mission.target,
      rewardGold: BigInt(mission.rewardGold),
      rewardXp: mission.rewardXp,
      active: true,
    };
    const { active: _active, ...updated } = data;
    await tx.mission.upsert({
      where: { id: mission.id },
      create: { id: mission.id, ...data },
      update: { ...updated, version: { increment: 1 } },
    });
  }
  for (const achievement of config.achievements) {
    const data = {
      key: achievement.slug,
      name: achievement.name,
      criteria: json(achievement),
      active: true,
    };
    await tx.achievement.upsert({
      where: { id: achievement.id },
      create: { id: achievement.id, ...data },
      update: data,
    });
  }
}

export async function activateConfiguration(
  tx: Tx,
  config: GameConfig,
  now: number,
) {
  // Existing references must survive publishing; archive a location/shop offer instead of deleting fish/item definitions.
  const fish = await tx.fishSpecies.findMany({ select: { id: true } });
  const equipment = await tx.equipment.findMany({
    select: { id: true, slot: true },
  });
  const baits = await tx.baitType.findMany({ select: { id: true } });
  assert(
    fish.every((f) => config.fish.some((c) => c.id === f.id)) &&
      equipment.every((e) => config.equipment.some((c) => c.id === e.id)) &&
      baits.every((b) => config.baits.some((c) => c.id === b.id)),
    422,
    'REFERENCED_DEFINITION_REMOVAL',
    'Giữ định nghĩa cá/trang bị/mồi để bảo toàn bộ sưu tập và túi đồ.',
  );
  assert(
    equipment.every((e) =>
      config.equipment.some(
        (c) => c.id === e.id && c.slot === e.slot && c.kind === e.slot,
      ),
    ),
    422,
    'IMMUTABLE_EQUIPMENT_SLOT',
  );
  await syncConfiguration(tx, config);
  await assertPlayableConfiguration(tx, config);
  await tx.systemConfig.updateMany({
    where: { key: 'game', isActive: true },
    data: { isActive: false },
  });
  return tx.systemConfig.upsert({
    where: { key_version: { key: 'game', version: config.version } },
    create: {
      key: 'game',
      version: config.version,
      schemaVersion: 1,
      value: json(config),
      publishedAt: new Date(now),
      isActive: true,
    },
    update: { publishedAt: new Date(now), isActive: true },
  });
}

export async function assertPlayableConfiguration(tx: Tx, config: GameConfig) {
  const fish = await tx.fishSpecies.findMany({
    where: { active: true },
    select: { id: true },
  });
  const equipment = await tx.equipment.findMany({
    where: { active: true },
    select: { id: true },
  });
  const baits = await tx.baitType.findMany({
    where: { active: true },
    select: { id: true },
  });
  const locations = await tx.fishingLocation.findMany({
    where: { active: true },
    select: { id: true },
  });
  const offers = await tx.shopItem.findMany({
    where: { active: true },
    select: { id: true },
  });
  assert(
    ['ROD', 'LINE', 'HOOK'].every((slot) =>
      config.equipment.some(
        (e) =>
          e.slot === slot &&
          e.minLevel === 1 &&
          equipment.some((a) => a.id === e.id),
      ),
    ),
    422,
    'ACTIVE_STARTER_EQUIPMENT_REQUIRED',
  );
  assert(
    config.baits.some(
      (b) =>
        b.slug === 'worm' &&
        b.minLevel === 1 &&
        baits.some((a) => a.id === b.id),
    ),
    422,
    'ACTIVE_STARTER_BAIT_REQUIRED',
  );
  assert(
    config.shop.some(
      (s) =>
        s.kind === 'BAIT' &&
        s.priceGold === '30' &&
        s.grantQuantity === 10 &&
        s.minLevel === 1 &&
        offers.some((a) => a.id === s.id) &&
        config.baits.some((b) => b.id === s.itemId && b.slug === 'worm'),
    ),
    422,
    'ACTIVE_WORM_OFFER_REQUIRED',
  );
  assert(
    config.locations.some(
      (l) =>
        l.minLevel === 1 &&
        l.entryFeeGold === '0' &&
        locations.some((a) => a.id === l.id) &&
        l.fishIds.some(
          (id) =>
            fish.some((a) => a.id === id) &&
            config.fish.some(
              (f) =>
                f.id === id &&
                f.rarity === 'COMMON' &&
                f.difficulty <= 25 &&
                f.spawnWeight > 0,
            ),
        ),
    ),
    422,
    'ACTIVE_STARTER_LAKE_REQUIRED',
  );
}
