import type { PlayerDto, InventoryDto, InventoryItemDto } from '@fwo/contracts';
import type { GameConfig } from '@fwo/game-config';
import { levelForXp, xpForLevel } from '@fwo/game-core';
import type { Tx } from '../../db.js';
import { json } from '../../db.js';
import { assert } from '../../lib/errors.js';
import { ledger } from '../../lib/transaction.js';

export { levelForXp };
export async function runtimeConfig(
  tx: Tx,
): Promise<{ id: string; value: GameConfig; version: number }> {
  const config = await tx.systemConfig.findFirst({
    where: { key: 'game', isActive: true },
    orderBy: { version: 'desc' },
  });
  assert(
    config,
    503,
    'GAME_NOT_INITIALIZED',
    'Chưa có dữ liệu game. Hãy chạy database seed.',
  );
  return {
    id: config.id,
    value: config.value as unknown as GameConfig,
    version: config.version,
  };
}
export async function getPlayer(tx: Tx, userId: string): Promise<PlayerDto> {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true, wallet: true, admin: true },
  });
  const profile = user.profile!;
  const level = levelForXp(profile.totalXp);
  const levelBase = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return {
    id: user.id,
    email: user.emailNormalized,
    phone: user.phoneE164,
    username: profile.username,
    avatarKey: profile.avatarKey ?? 'angler-1',
    level,
    totalXp: profile.totalXp,
    levelProgress: {
      currentXp: profile.totalXp - levelBase,
      requiredXp: nextLevelXp - levelBase,
      remainingXp: nextLevelXp - profile.totalXp,
      nextLevel: level + 1,
    },
    gold: user.wallet!.balanceGold.toString(),
    totalFish: profile.totalFish,
    largestFishG: profile.largestFishG,
    createdAt: user.createdAt.toISOString(),
    role: user.admin?.role ?? 'PLAYER',
  };
}
export async function initializePlayer(
  tx: Tx,
  userId: string,
  username: string,
  now: number,
) {
  const { value: config } = await runtimeConfig(tx);
  const rod = config.equipment.find(
    (e) => e.kind === 'ROD' && e.minLevel === 1,
  );
  const bait = config.baits.find((b) => b.slug === 'worm' && b.minLevel === 1);
  assert(rod && bait, 503, 'STARTER_CONFIG_MISSING');
  await tx.userProfile.create({
    data: {
      userId,
      username,
      normalizedUsername: username.toLocaleLowerCase('vi').normalize('NFKC'),
      avatarKey: 'angler-1',
      settings: { soundEnabled: true, language: 'vi' },
    },
  });
  await tx.wallet.create({ data: { userId } });
  await ledger(tx, userId, 200n, 'STARTER', userId, now);
  const starters = [
    rod,
    config.equipment.find((e) => e.kind === 'LINE' && e.minLevel === 1),
    config.equipment.find((e) => e.kind === 'HOOK' && e.minLevel === 1),
  ];
  assert(starters.every(Boolean), 503, 'STARTER_CONFIG_MISSING');
  for (const item of starters) {
    assert(item, 503, 'STARTER_CONFIG_MISSING');
    const inventory = await tx.userInventory.create({
      data: { userId, equipmentId: item.id, quantity: 1 },
    });
    await tx.userEquipment.create({
      data: { userId, inventoryId: inventory.id, slot: item.slot },
    });
  }
  await tx.userInventory.create({
    data: { userId, baitTypeId: bait.id, quantity: 20 },
  });
}
export async function getInventory(
  tx: Tx,
  userId: string,
): Promise<InventoryDto> {
  const { value: config } = await runtimeConfig(tx);
  const rows = await tx.userInventory.findMany({
    where: { userId },
    include: { equipped: true },
    orderBy: { createdAt: 'asc' },
    take: 300,
  });
  const items: InventoryItemDto[] = [];
  const equipped: InventoryDto['equipped'] = {};
  for (const row of rows) {
    const definition = row.equipmentId
      ? config.equipment.find((e) => e.id === row.equipmentId)
      : config.baits.find((b) => b.id === row.baitTypeId);
    if (!definition) continue;
    const isEquipment = 'slot' in definition;
    const item: InventoryItemDto = {
      id: row.id,
      slug: definition.slug,
      name: definition.name,
      kind: definition.kind,
      quantity: row.quantity,
      upgradeLevel: row.upgradeLevel,
      equipped: !!row.equipped,
      power: isEquipment ? definition.power + row.upgradeLevel : 0,
      control: isEquipment ? definition.control + row.upgradeLevel : 0,
      minLevel: definition.minLevel,
      imageKey: definition.imageKey,
      ...(isEquipment ? { slot: definition.slot } : {}),
      ...(isEquipment && definition.kind === 'ROD' && row.upgradeLevel < 2
        ? { upgradeCostGold: row.upgradeLevel === 0 ? '100' : '250' }
        : {}),
    };
    items.push(item);
    if (row.equipped && row.equipped.slot !== 'COSMETIC')
      equipped[row.equipped.slot] = row.id;
  }
  return { items, equipped };
}
export async function grantItem(
  tx: Tx,
  userId: string,
  itemId: string,
  kind: string,
  quantity: number,
  allowDuplicateEquipment = false,
) {
  if (kind === 'BAIT') {
    const existing = await tx.userInventory.findFirst({
      where: { userId, baitTypeId: itemId },
    });
    if (existing)
      return tx.userInventory.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    return tx.userInventory.create({
      data: { userId, baitTypeId: itemId, quantity },
    });
  }
  const existing = await tx.userInventory.findFirst({
    where: { userId, equipmentId: itemId },
  });
  assert(
    allowDuplicateEquipment || !existing,
    409,
    'ALREADY_OWNED',
    'Bạn đã sở hữu trang bị này.',
  );
  assert(quantity === 1, 422, 'EQUIPMENT_QUANTITY_LIMIT');
  return tx.userInventory.create({
    data: { userId, equipmentId: itemId, quantity: 1 },
  });
}
export async function ensureNoActiveSession(tx: Tx, userId: string) {
  const active = await tx.fishingSession.findFirst({
    where: { userId, state: { not: 'FINISHED' } },
  });
  assert(
    !active,
    409,
    'ACTIVE_FISHING_SESSION',
    'Hãy hoàn tất lượt câu trước khi thay đổi trang bị.',
  );
}
export function periodFor(now: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
}
export function periodEnds(periodKey: string) {
  return new Date(
    new Date(`${periodKey}T00:00:00+07:00`).getTime() + 86400_000,
  );
}
export async function ensureDailyMissions(tx: Tx, userId: string, now: number) {
  const { value: config } = await runtimeConfig(tx);
  const periodKey = periodFor(now);
  const activeIds = new Set(
    (
      await tx.mission.findMany({
        where: { active: true },
        select: { id: true },
      })
    ).map((m) => m.id),
  );
  for (const mission of config.missions) {
    if (!activeIds.has(mission.id)) continue;
    await tx.userMission.upsert({
      where: {
        userId_missionId_periodKey: {
          userId,
          missionId: mission.id,
          periodKey,
        },
      },
      update: {},
      create: {
        userId,
        missionId: mission.id,
        periodKey,
        criteriaSnapshot: json(mission),
        rewardSnapshot: { gold: mission.rewardGold, xp: mission.rewardXp },
      },
    });
  }
  return periodKey;
}
export async function updateCatchProgress(tx: Tx, userId: string, now: number) {
  const periodKey = await ensureDailyMissions(tx, userId, now);
  const start = new Date(`${periodKey}T00:00:00+07:00`);
  const catches = await tx.fishingCatch.findMany({
    where: { userId, createdAt: { gte: start, lt: periodEnds(periodKey) } },
    select: { fishId: true, weightG: true },
  });
  const rows = await tx.userMission.findMany({ where: { userId, periodKey } });
  for (const row of rows) {
    const criteria = row.criteriaSnapshot as unknown as {
      metric: string;
      target: number;
    };
    const progress =
      criteria.metric === 'CATCH_COUNT'
        ? catches.length
        : criteria.metric === 'SPECIES_COUNT'
          ? new Set(catches.map((c) => c.fishId)).size
          : catches.reduce((sum, c) => sum + c.weightG, 0);
    await tx.userMission.update({
      where: { id: row.id },
      data: {
        progress: Math.min(progress, criteria.target),
        ...(progress >= criteria.target && !row.completedAt
          ? { completedAt: new Date(now) }
          : {}),
      },
    });
  }
  const { value: config } = await runtimeConfig(tx);
  const player = await getPlayer(tx, userId);
  const speciesCount = await tx.fishCollection.count({ where: { userId } });
  for (const achievement of config.achievements) {
    const progress =
      achievement.metric === 'CATCH_COUNT'
        ? player.totalFish
        : achievement.metric === 'SPECIES_COUNT'
          ? speciesCount
          : player.largestFishG;
    if (progress >= achievement.target)
      await tx.userAchievement.upsert({
        where: {
          userId_achievementId: { userId, achievementId: achievement.id },
        },
        update: {},
        create: {
          userId,
          achievementId: achievement.id,
          unlockedAt: new Date(now),
        },
      });
  }
}
