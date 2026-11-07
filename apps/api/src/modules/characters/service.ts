import { randomUUID } from 'node:crypto';
import {
  characterSchema,
  characterSlots,
  appearanceSchema,
  characterEquipmentSchema,
  characterCatalogSchema,
} from '@fwo/contracts';
import type {
  CharacterAppearance,
  CharacterEquipment,
  CharacterDto,
} from '@fwo/contracts';
import type { Tx } from '../../db.js';
import { assert } from '../../lib/errors.js';
import { json } from '../../db.js';
import { levelForXp } from '../players/service.js';

export async function getCharacter(
  tx: Tx,
  userId: string,
): Promise<CharacterDto | null> {
  const row = await tx.playerCharacter.findUnique({
    where: { userId },
    include: {
      equipment: { include: { inventory: { include: { cosmetic: true } } } },
    },
  });
  if (!row) return null;
  return characterSchema.parse({
    id: row.id,
    name: row.name,
    presetId: row.presetId,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    appearance: row.appearance,
    equipmentAssets: Object.fromEntries(
      characterSlots.map((slot) => [
        slot,
        row.equipment.find((e) => e.slot === slot)?.inventory.cosmetic
          ?.assetId ?? null,
      ]),
    ),
    equipment: Object.fromEntries(
      characterSlots.map((slot) => [
        slot,
        row.equipment.find((e) => e.slot === slot)?.inventory.cosmeticId ??
          null,
      ]),
    ),
  });
}
export async function catalog(tx: Tx, userId: string) {
  const [presets, cosmetics, inventory, profile, counts] = await Promise.all([
    tx.characterPreset.findMany({ orderBy: { id: 'asc' } }),
    tx.characterCosmetic.findMany({ orderBy: { id: 'asc' } }),
    tx.userInventory.findMany({
      where: { userId, cosmeticId: { not: null } },
      select: { cosmeticId: true },
    }),
    tx.userProfile.findUniqueOrThrow({ where: { userId } }),
    tx.$queryRaw<
      { id: string; count: number }[]
    >`SELECT properties->>'itemId' AS id, count(*)::int AS count FROM analytics_events WHERE event_name='cosmetic_purchased' GROUP BY properties->>'itemId'`,
  ]);
  const owned = new Set(inventory.map((i) => i.cosmeticId));
  return characterCatalogSchema.parse({
    presets,
    cosmetics: cosmetics.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      purchaseCount: counts.find((p) => p.id === c.id)?.count ?? 0,
      priceGold: c.priceGold.toString(),
      priceDiamonds: c.priceDiamonds.toString(),
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      owned:
        owned.has(c.id) ||
        (['FREE', 'LEVEL'].includes(c.unlockType) &&
          levelForXp(profile.totalXp) >= c.minLevel),
    })),
  });
}
/** Grant free/level cosmetics lazily; paid items always require an inventory receipt. */
export async function validateWardrobe(
  tx: Tx,
  userId: string,
  equipment: CharacterEquipment,
  appearance: CharacterAppearance,
  now: number,
) {
  characterEquipmentSchema.parse(equipment);
  appearanceSchema.parse(appearance);
  for (const slot of ['HAIR', 'UPPER', 'LOWER', 'SHOES'] as const)
    assert(
      equipment[slot],
      422,
      'CLOTHING_REQUIRED',
      'Vui lòng chọn tóc, áo, quần/váy và giày.',
    );
  const ids = Object.entries(equipment)
    .filter(([, id]) => id !== null)
    .map(([slot, id]) => ({ slot, id: id! }));
  const paidColors = new Set(['WINE', 'LILAC', 'BLUSH']);
  for (const color of new Set([
    appearance.clothColor,
    appearance.hairColor,
    appearance.trimColor,
    ...Object.values(appearance.dyes),
  ]))
    if (color && paidColors.has(color))
      ids.push({ slot: 'DYE', id: `dye-${color.toLowerCase()}` });
  if (appearance.pattern !== 'PLAIN')
    ids.push({
      slot: 'PATTERN',
      id: `pattern-${appearance.pattern.toLowerCase()}`,
    });
  const profile = await tx.userProfile.findUniqueOrThrow({ where: { userId } });
  const level = levelForXp(profile.totalXp);
  const result: Record<string, string> = {};
  for (const { slot, id } of ids) {
    const item = await tx.characterCosmetic.findUnique({ where: { id } });
    assert(
      item && item.slot === slot && item.active,
      422,
      'INVALID_COSMETIC',
      'Vật phẩm thời trang không khả dụng.',
    );
    assert(level >= item.minLevel, 422, 'LEVEL_REQUIRED');
    let owned = await tx.userInventory.findUnique({
      where: { userId_cosmeticId: { userId, cosmeticId: id } },
    });
    if (!owned && ['FREE', 'LEVEL'].includes(item.unlockType)) {
      assert(
        (!item.startsAt || item.startsAt.getTime() <= now) &&
          (!item.endsAt || item.endsAt.getTime() > now),
        422,
        'COSMETIC_LOCKED',
      );
      owned = await tx.userInventory.create({
        data: { userId, cosmeticId: id, quantity: 1 },
      });
    }
    assert(
      owned?.quantity === 1,
      403,
      'COSMETIC_NOT_OWNED',
      'Bạn chưa sở hữu vật phẩm thời trang này.',
    );
    result[slot] = owned.id;
  }
  return result;
}
export async function applyEquipment(
  tx: Tx,
  characterId: string,
  inventory: Record<string, string>,
  now: number,
) {
  await tx.characterEquipment.deleteMany({ where: { characterId } });
  for (const slot of characterSlots)
    if (inventory[slot])
      await tx.characterEquipment.create({
        data: {
          characterId,
          slot,
          inventoryId: inventory[slot]!,
          equippedAt: new Date(now),
        },
      });
}
export async function diamondLedger(
  tx: Tx,
  userId: string,
  amount: bigint,
  reason: string,
  reference: string,
  now: number,
) {
  const prior = await tx.diamondTransaction.findUnique({
    where: { reference },
  });
  if (prior) return;
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  const next = wallet.balanceDiamonds + amount;
  assert(
    next >= 0n && next <= 9_000_000_000_000n,
    422,
    'INSUFFICIENT_DIAMONDS',
    'Bạn chưa có đủ kim cương.',
  );
  if (amount === 0n) return;
  await tx.diamondTransaction.create({
    data: {
      userId,
      amount,
      balanceAfter: next,
      reason,
      reference,
      createdAt: new Date(now),
    },
  });
  await tx.wallet.update({
    where: { userId },
    data: { balanceDiamonds: next },
  });
}
export async function auditCharacter(
  tx: Tx,
  userId: string,
  action: string,
  entityId: string,
  before: unknown,
  after: unknown,
  now: number,
) {
  await tx.auditLog.create({
    data: {
      actorId: userId,
      action,
      actorSnapshot: { userId },
      targetType: 'CHARACTER',
      targetId: entityId,
      requestId: randomUUID(),
      before: json(before),
      after: json(after),
      reason: action,
      createdAt: new Date(now),
    },
  });
}
