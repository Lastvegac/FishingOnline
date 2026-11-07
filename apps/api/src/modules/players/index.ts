import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  equipSchema,
  unequipSchema,
  upgradeSchema,
  useItemSchema,
  shopOrderSchema,
  shopQuerySchema,
  shopSaleSchema,
  missionClaimSchema,
  leaderboardQuerySchema,
  catchExchangeSchema,
} from '@fwo/contracts';
import type { CatchDto } from '@fwo/contracts';
import {
  FISH_EXCHANGE_DAILY_CAP,
  toPublicFish,
  toPublicLocation,
} from '@fwo/game-config';
import { offerLocationIds } from '@fwo/game-config';
import type { GameConfig, MissionConfig, ShopConfig } from '@fwo/game-config';
import { upgradeCost } from '@fwo/game-core';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import { json } from '../../db.js';
import { assert } from '../../lib/errors.js';
import { event, ledger, mutation, lockPlayer } from '../../lib/transaction.js';
import {
  runtimeConfig,
  getPlayer,
  getInventory,
  grantItem,
  ensureNoActiveSession,
  ensureDailyMissions,
  periodFor,
  periodEnds,
  levelForXp,
} from './service.js';

const auth = { config: { auth: true }, schema: { tags: ['Game'] } };
/** Local goods trade only at an active spot the player has unlocked. */
async function assertShopAccess(
  tx: Parameters<typeof getPlayer>[0],
  config: GameConfig,
  item: ShopConfig,
  locationId: string | undefined,
  level: number,
) {
  const spots = offerLocationIds(item);
  if (spots.length === 0) return;
  const location = config.locations.find((l) => l.id === locationId);
  assert(
    location && spots.includes(location.id),
    422,
    'LOCAL_SHOP_REQUIRED',
    'Vật phẩm này chỉ giao dịch tại tiệm của điểm câu tương ứng.',
  );
  assert(level >= location.minLevel, 422, 'LOCATION_LOCKED');
  assert(
    await tx.fishingLocation.findFirst({
      where: { id: location.id, active: true },
    }),
    422,
    'LOCATION_LOCKED',
  );
}
async function exchangeBudget(
  tx: Parameters<typeof getPlayer>[0],
  userId: string,
  now: number,
) {
  const resetAt = periodEnds(periodFor(now));
  const used = await tx.fishingCatch.aggregate({
    where: {
      userId,
      exchangedAt: {
        gte: new Date(resetAt.getTime() - 86400_000),
        lt: resetAt,
      },
    },
    _sum: { rewardGold: true },
  });
  const remaining = FISH_EXCHANGE_DAILY_CAP - (used._sum.rewardGold ?? 0n);
  return {
    dailyCapGold: FISH_EXCHANGE_DAILY_CAP.toString(),
    remainingGold: (remaining > 0n ? remaining : 0n).toString(),
    resetAt: resetAt.toISOString(),
  };
}
export function registerPlayers(ctx: Context) {
  const { app, db, now } = ctx;
  app.get('/api/v1/fish', auth, async () => ({
    data: { items: (await runtimeConfig(db)).value.fish.map(toPublicFish) },
  }));
  app.get(
    '/api/v1/locations',
    { ...auth, config: { auth: true, fishingAccess: 'context' } },
    async (request) => {
      const player = await getPlayer(db, principal(request).id);
      const active = new Set(
        (
          await db.fishingLocation.findMany({
            where: { active: true },
            select: { id: true },
          })
        ).map((l) => l.id),
      );
      return {
        data: {
          items: (await runtimeConfig(db)).value.locations
            .filter((l) => active.has(l.id))
            .map((l) => toPublicLocation(l, player.level)),
        },
      };
    },
  );
  app.get('/api/v1/locations/:id', auth, async (request) => {
    const id = z.uuid().parse((request.params as { id: string }).id);
    const config = await runtimeConfig(db);
    const location = config.value.locations.find((l) => l.id === id);
    assert(location, 404, 'NOT_FOUND');
    return {
      data: {
        ...toPublicLocation(
          location,
          (await getPlayer(db, principal(request).id)).level,
        ),
        fish: config.value.fish
          .filter((f) => location.fishIds.includes(f.id))
          .map(toPublicFish),
      },
    };
  });
  app.get('/api/v1/equipment', auth, async () => ({
    data: { items: (await runtimeConfig(db)).value.equipment },
  }));
  app.get(
    '/api/v1/inventory',
    { ...auth, config: { auth: true, fishingAccess: 'context' } },
    async (request) => ({
      data: await getInventory(db, principal(request).id),
    }),
  );
  app.get('/api/v1/inventory/catches', auth, async (request) => {
    const query = z
      .strictObject({ cursor: z.uuid().optional() })
      .parse(request.query);
    const userId = principal(request).id;
    // Use the same player lock as exchange so the list and quota agree.
    const data = await db.$transaction(async (tx) => {
      await lockPlayer(tx, userId);
      const rows = await tx.fishingCatch.findMany({
        where: { userId, goldClaimed: false },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 21,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const more = rows.length > 20;
      if (more) rows.pop();
      return {
        items: rows.map((row) => ({
          ...(row.rewardSnapshot as unknown as CatchDto),
          caughtAt: row.createdAt.toISOString(),
        })),
        nextCursor: more ? rows.at(-1)!.id : null,
        ...(await exchangeBudget(tx, userId, now())),
      };
    });
    return { data };
  });
  app.post('/api/v1/inventory/catches/:id/exchange', auth, async (request) => {
    const id = z.uuid().parse((request.params as { id: string }).id);
    const input = catchExchangeSchema.parse(request.body);
    return {
      data: await mutation(
        ctx,
        request,
        `/inventory/catches/${id}/exchange`,
        async (tx, userId) => {
          const caught = await tx.fishingCatch.findFirst({
            where: { id, userId },
          });
          assert(caught, 404, 'NOT_FOUND');
          assert(
            !caught.goldClaimed,
            409,
            'CATCH_ALREADY_EXCHANGED',
            'Cá này đã được ghi nhận Gold.',
          );
          assert(
            caught.rewardGold.toString() === input.expectedGold,
            409,
            'PRICE_CHANGED',
            'Giá đổi đã thay đổi. Hãy tải lại giỏ cá.',
          );
          const at = now();
          const budget = await exchangeBudget(tx, userId, at);
          assert(
            caught.rewardGold <= BigInt(budget.remainingGold),
            422,
            'EXCHANGE_DAILY_LIMIT',
            'Đã chạm giới hạn đổi cá hôm nay. Cá vẫn được giữ trong giỏ để đổi vào ngày sau.',
          );
          await ledger(
            tx,
            userId,
            caught.rewardGold,
            'FISH_EXCHANGE',
            caught.id,
            at,
          );
          await tx.fishingCatch.update({
            where: { id },
            data: { goldClaimed: true, exchangedAt: new Date(at) },
          });
          await event(
            tx,
            userId,
            'fish_exchanged',
            { catchId: id, gold: caught.rewardGold.toString() },
            at,
          );
          return {
            player: await getPlayer(tx, userId),
            ...(await exchangeBudget(tx, userId, at)),
          };
        },
      ),
    };
  });
  app.post('/api/v1/inventory/equip', auth, async (request) => {
    const input = equipSchema.parse(request.body);
    return {
      data: await mutation(
        ctx,
        request,
        '/inventory/equip',
        async (tx, userId) => {
          await ensureNoActiveSession(tx, userId);
          const inventory = await getInventory(tx, userId);
          const item = inventory.items.find(
            (i) => i.id === input.inventoryItemId,
          );
          assert(item?.slot && item.quantity > 0, 422, 'INVALID_EQUIPMENT');
          assert(
            (await getPlayer(tx, userId)).level >= item.minLevel,
            422,
            'LEVEL_REQUIRED',
          );
          await tx.userEquipment.upsert({
            where: { userId_slot: { userId, slot: item.slot } },
            update: { inventoryId: item.id },
            create: { userId, slot: item.slot, inventoryId: item.id },
          });
          await event(tx, userId, 'item_equipped', { itemId: item.id }, now());
          return getInventory(tx, userId);
        },
      ),
    };
  });
  app.post('/api/v1/inventory/unequip', auth, async (request) => {
    const input = unequipSchema.parse(request.body);
    return {
      data: await mutation(
        ctx,
        request,
        '/inventory/unequip',
        async (tx, userId) => {
          await ensureNoActiveSession(tx, userId);
          assert(
            input.slot !== 'ROD',
            422,
            'ROD_REQUIRED',
            'Hãy trang bị cần khác trước.',
          );
          await tx.userEquipment.deleteMany({
            where: { userId, slot: input.slot },
          });
          return getInventory(tx, userId);
        },
      ),
    };
  });
  app.post('/api/v1/inventory/upgrade', auth, async (request) => {
    const input = upgradeSchema.parse(request.body);
    return {
      data: await mutation(
        ctx,
        request,
        '/inventory/upgrade',
        async (tx, userId, key) => {
          await ensureNoActiveSession(tx, userId);
          const item = await tx.userInventory.findFirst({
            where: { id: input.inventoryItemId, userId },
            include: { equipment: true },
          });
          assert(item?.equipment?.slot === 'ROD', 422, 'NOT_UPGRADABLE');
          assert(
            item.upgradeLevel === input.expectedUpgradeLevel,
            409,
            'LEVEL_CHANGED',
          );
          assert(item.upgradeLevel < 2, 422, 'MAX_UPGRADE');
          await ledger(
            tx,
            userId,
            -BigInt(upgradeCost(item.upgradeLevel)),
            'UPGRADE',
            key,
            now(),
          );
          await tx.userInventory.update({
            where: { id: item.id },
            data: { upgradeLevel: { increment: 1 } },
          });
          return {
            inventory: await getInventory(tx, userId),
            player: await getPlayer(tx, userId),
          };
        },
      ),
    };
  });
  app.post('/api/v1/inventory/use', auth, async (request) => {
    useItemSchema.parse(request.body);
    assert(
      false,
      422,
      'ITEM_NOT_SUPPORTED',
      'Mồi được sử dụng tự động khi thả câu.',
    );
  });
  app.post('/api/v1/inventory/rescue', auth, async (request) => ({
    data: await mutation(
      ctx,
      request,
      '/inventory/rescue',
      async (tx, userId) => {
        const config = await runtimeConfig(tx);
        const worm = config.value.baits.find((b) => b.slug === 'worm');
        assert(worm, 503, 'GAME_NOT_INITIALIZED');
        const player = await getPlayer(tx, userId);
        const bait = await tx.userInventory.findFirst({
          where: { userId, baitTypeId: worm.id },
        });
        assert(
          (bait?.quantity ?? 0) === 0 && BigInt(player.gold) < 30n,
          422,
          'RESCUE_NOT_ELIGIBLE',
          'Chỉ nhận mồi cứu trợ khi hết giun và còn dưới 30 Gold.',
        );
        const periodKey = periodFor(now());
        const existing = await tx.userGrant.findUnique({
          where: {
            userId_key_periodKey: {
              userId,
              key: 'DAILY_BAIT_RESCUE',
              periodKey,
            },
          },
        });
        assert(!existing, 409, 'RESCUE_ALREADY_CLAIMED');
        await tx.userGrant.create({
          data: {
            userId,
            key: 'DAILY_BAIT_RESCUE',
            periodKey,
            payload: {
              baitId: worm.id,
              quantity: 5,
              configVersion: config.version,
            },
          },
        });
        await grantItem(tx, userId, worm.id, 'BAIT', 5);
        return {
          inventory: await getInventory(tx, userId),
          player: await getPlayer(tx, userId),
        };
      },
    ),
  }));
  app.get('/api/v1/wallet', auth, async (request) => ({
    data: { balanceGold: (await getPlayer(db, principal(request).id)).gold },
  }));
  app.get('/api/v1/wallet/transactions', auth, async (request) => {
    const query = z
      .object({
        cursor: z.uuid().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(request.query);
    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: principal(request).id },
    });
    const items = await db.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const more = items.length > query.limit;
    if (more) items.pop();
    return {
      data: {
        items: items.map((t) => ({
          id: t.id,
          amount: t.deltaGold.toString(),
          balanceAfter: t.balanceAfterGold.toString(),
          reason: t.reason,
          createdAt: t.createdAt.toISOString(),
        })),
        nextCursor: more ? items.at(-1)?.id : null,
      },
    };
  });
  app.get('/api/v1/shop', auth, async (request) => {
    const query = shopQuerySchema.parse(request.query ?? {});
    const config = await runtimeConfig(db);
    if (query.locationId)
      assert(
        config.value.locations.some((l) => l.id === query.locationId),
        404,
        'LOCATION_NOT_FOUND',
      );
    const inventory = await db.userInventory.findMany({
      where: { userId: principal(request).id },
      select: { equipmentId: true },
    });
    const active = new Set(
      (
        await db.shopItem.findMany({
          where: { active: true },
          select: { id: true },
        })
      ).map((i) => i.id),
    );
    return {
      data: {
        configVersion: config.version,
        // Without locationId this is the full catalog; each offer says where it is sold.
        items: config.value.shop
          .filter(
            (i) =>
              active.has(i.id) &&
              (!query.locationId ||
                offerLocationIds(i).length === 0 ||
                offerLocationIds(i).includes(query.locationId)),
          )
          .map(({ itemId, ...item }) => ({
            ...item,
            locationIds: offerLocationIds(item),
            itemSlug:
              [...config.value.equipment, ...config.value.baits].find(
                (definition) => definition.id === itemId,
              )?.slug ?? item.slug,
            owned:
              item.kind !== 'BAIT' &&
              inventory.some((i) => i.equipmentId === itemId),
          })),
      },
    };
  });
  app.post('/api/v1/shop/orders', auth, async (request, reply) => {
    const input = shopOrderSchema.parse(request.body);
    const data = await mutation(
      ctx,
      request,
      '/shop/orders',
      async (tx, userId, key) => {
        const config = await runtimeConfig(tx);
        const item = config.value.shop.find((s) => s.id === input.shopItemId);
        assert(item, 404, 'NOT_FOUND');
        assert(
          config.version === input.configVersion &&
            item.priceGold === input.expectedUnitPriceGold,
          409,
          'PRICE_CHANGED',
        );
        const level = (await getPlayer(tx, userId)).level;
        assert(level >= item.minLevel, 422, 'LEVEL_REQUIRED');
        await assertShopAccess(tx, config.value, item, input.locationId, level);
        await tx.$queryRaw`SELECT id FROM shop_items WHERE id = ${item.id}::uuid FOR UPDATE`;
        const shop = await tx.shopItem.findUniqueOrThrow({
          where: { id: item.id },
        });
        assert(
          shop.active && (shop.stock === null || shop.stock >= input.quantity),
          409,
          'OUT_OF_STOCK',
        );
        assert(
          item.kind === 'BAIT' || input.quantity === 1,
          422,
          'EQUIPMENT_QUANTITY_LIMIT',
        );
        const orderId = randomUUID();
        const total = BigInt(item.priceGold) * BigInt(input.quantity);
        await ledger(tx, userId, -total, 'PURCHASE', orderId, now());
        await grantItem(
          tx,
          userId,
          item.itemId,
          item.kind,
          input.quantity * item.grantQuantity,
        );
        await tx.shopOrder.create({
          data: {
            id: orderId,
            userId,
            shopItemId: item.id,
            quantity: input.quantity,
            unitPriceGold: BigInt(item.priceGold),
            totalGold: total,
            itemSnapshot: json(item),
            idempotencyKey: key,
          },
        });
        if (shop.stock !== null)
          await tx.shopItem.update({
            where: { id: shop.id },
            data: { stock: { decrement: input.quantity } },
          });
        await event(
          tx,
          userId,
          'item_purchased',
          {
            itemId: item.id,
            quantity: input.quantity,
            locationId: input.locationId ?? null,
          },
          now(),
        );
        return {
          orderId,
          player: await getPlayer(tx, userId),
          inventory: await getInventory(tx, userId),
        };
      },
    );
    reply.code(201);
    return { data };
  });
  // Sell owned bait/gear back to a shop offer that publishes a buy-back price.
  app.post('/api/v1/shop/sales', auth, async (request, reply) => {
    const input = shopSaleSchema.parse(request.body);
    const data = await mutation(
      ctx,
      request,
      '/shop/sales',
      async (tx, userId) => {
        await ensureNoActiveSession(tx, userId);
        const config = await runtimeConfig(tx);
        const item = config.value.shop.find((s) => s.id === input.shopItemId);
        assert(item, 404, 'NOT_FOUND');
        assert(
          item.sellPriceGold !== undefined,
          422,
          'NOT_SELLABLE',
          'Tiệm không thu mua vật phẩm này.',
        );
        assert(
          config.version === input.configVersion &&
            item.sellPriceGold === input.expectedUnitPriceGold,
          409,
          'PRICE_CHANGED',
        );
        assert(
          await tx.shopItem.findFirst({ where: { id: item.id, active: true } }),
          409,
          'OFFER_INACTIVE',
        );
        const level = (await getPlayer(tx, userId)).level;
        await assertShopAccess(tx, config.value, item, input.locationId, level);
        const owned = await tx.userInventory.findFirst({
          where: { id: input.inventoryItemId, userId },
          include: { equipped: true },
        });
        assert(
          owned &&
            (item.kind === 'BAIT'
              ? owned.baitTypeId === item.itemId
              : owned.equipmentId === item.itemId),
          404,
          'INVENTORY_ITEM_NOT_FOUND',
        );
        const saleId = randomUUID();
        if (item.kind === 'BAIT') {
          // Conditional decrement: concurrent sales cannot drive the stack negative.
          const updated = await tx.userInventory.updateMany({
            where: { id: owned.id, quantity: { gte: input.quantity } },
            data: { quantity: { decrement: input.quantity } },
          });
          assert(updated.count === 1, 422, 'INSUFFICIENT_QUANTITY');
        } else {
          assert(input.quantity === 1, 422, 'EQUIPMENT_QUANTITY_LIMIT');
          assert(
            !owned.equipped,
            422,
            'ITEM_EQUIPPED',
            'Hãy tháo trang bị trước khi bán.',
          );
          await tx.userInventory.delete({ where: { id: owned.id } });
        }
        const total = BigInt(item.sellPriceGold) * BigInt(input.quantity);
        await ledger(tx, userId, total, 'ITEM_SALE', saleId, now());
        await event(
          tx,
          userId,
          'item_sold',
          {
            saleId,
            shopItemId: item.id,
            itemId: item.itemId,
            quantity: input.quantity,
            unitPriceGold: item.sellPriceGold,
            totalGold: total.toString(),
            upgradeLevel: owned.upgradeLevel,
            locationId: input.locationId ?? null,
            configVersion: config.version,
          },
          now(),
        );
        return {
          saleId,
          totalGold: total.toString(),
          player: await getPlayer(tx, userId),
          inventory: await getInventory(tx, userId),
        };
      },
    );
    reply.code(201);
    return { data };
  });
  app.get('/api/v1/collection', auth, async (request) => {
    const userId = principal(request).id;
    const config = await runtimeConfig(db);
    const rows = await db.fishCollection.findMany({ where: { userId } });
    const records = await db.$queryRaw<Array<{ reward_snapshot: CatchDto }>>`
      SELECT DISTINCT ON (fish_id) reward_snapshot FROM fishing_catches
      WHERE user_id = ${userId}::uuid ORDER BY fish_id, weight_g DESC, created_at, id`;
    return {
      data: {
        items: config.value.fish.map((fish) => {
          const row = rows.find((c) => c.fishId === fish.id);
          return {
            fish: toPublicFish(fish),
            count: row?.count ?? 0,
            bestWeightG: row?.bestWeightG ?? 0,
            ...(row
              ? {
                  bestCatch: records.find(
                    (c) => c.reward_snapshot.fish.id === fish.id,
                  )?.reward_snapshot,
                }
              : {}),
            ...(row
              ? {
                  firstCaughtAt: row.firstCaughtAt.toISOString(),
                  lastCaughtAt: row.lastCaughtAt.toISOString(),
                }
              : {}),
          };
        }),
      },
    };
  });
  app.get('/api/v1/missions', auth, async (request) => {
    const userId = principal(request).id;
    return db.$transaction(async (tx) => {
      await lockPlayer(tx, userId);
      const periodKey = await ensureDailyMissions(tx, userId, now());
      const rows = await tx.userMission.findMany({
        where: {
          userId,
          OR: [
            { periodKey },
            {
              completedAt: { not: null },
              claimedAt: null,
              periodKey: periodFor(now() - 86400_000),
            },
          ],
        },
        orderBy: [{ periodKey: 'desc' }, { missionId: 'asc' }],
      });
      return {
        data: {
          periodKey,
          resetAt: periodEnds(periodKey).toISOString(),
          items: rows
            .map((row) => {
              const mission = row.criteriaSnapshot as unknown as MissionConfig;
              const reward = row.rewardSnapshot as unknown as {
                gold: string;
                xp: number;
              };
              return {
                id: row.missionId,
                name: mission.name,
                description: mission.description,
                target: mission.target,
                progress: row.progress,
                rewardGold: reward.gold,
                rewardXp: reward.xp,
                claimedAt: row.claimedAt?.toISOString() ?? null,
                completedAt: row.completedAt?.toISOString() ?? null,
                claimDeadline: new Date(
                  periodEnds(row.periodKey).getTime() + 12 * 3600_000,
                ).toISOString(),
                periodKey: row.periodKey,
              };
            })
            .filter(
              (m) =>
                m.periodKey === periodKey ||
                new Date(m.claimDeadline).getTime() > now(),
            ),
        },
      };
    });
  });
  app.post('/api/v1/missions/:id/claim', auth, async (request) => {
    const missionId = z.uuid().parse((request.params as { id: string }).id);
    const { periodKey } = missionClaimSchema.parse(request.body);
    return {
      data: await mutation(
        ctx,
        request,
        `/missions/${missionId}/claim`,
        async (tx, userId) => {
          const mission = await tx.userMission.findUnique({
            where: {
              userId_missionId_periodKey: { userId, missionId, periodKey },
            },
          });
          assert(mission?.completedAt, 422, 'NOT_COMPLETED');
          assert(!mission.claimedAt, 409, 'ALREADY_CLAIMED');
          assert(
            now() < periodEnds(periodKey).getTime() + 12 * 3600_000,
            422,
            'EXPIRED',
          );
          const reward = mission.rewardSnapshot as unknown as {
            gold: string;
            xp: number;
          };
          await ledger(
            tx,
            userId,
            BigInt(reward.gold),
            'MISSION',
            mission.id,
            now(),
          );
          await tx.userProfile.update({
            where: { userId },
            data: { totalXp: { increment: reward.xp } },
          });
          await tx.userMission.update({
            where: { id: mission.id },
            data: { claimedAt: new Date(now()) },
          });
          await event(
            tx,
            userId,
            'mission_completed',
            { missionId, periodKey },
            now(),
          );
          return { player: await getPlayer(tx, userId) };
        },
      ),
    };
  });
  app.get('/api/v1/leaderboard', auth, async (request) => {
    const query = leaderboardQuerySchema.parse(request.query);
    const field =
      query.metric === 'largestFish' ? 'largestFishG' : query.metric;
    const rows = await db.userProfile.findMany({
      where: { user: { status: 'ACTIVE', deletedAt: null } },
      orderBy: [{ [field]: 'desc' }, { userId: 'asc' }],
      take: 100,
    });
    const items = rows.map((row, i) => ({
      rank: i + 1,
      userId: row.userId,
      username: row.username,
      avatarKey: row.avatarKey ?? 'angler-1',
      level: levelForXp(row.totalXp),
      totalFish: row.totalFish,
      largestFishG: row.largestFishG,
      totalXp: row.totalXp,
    }));
    return {
      data: {
        items,
        myRank: items.find((i) => i.userId === principal(request).id)?.rank,
      },
    };
  });
  app.get('/api/v1/achievements', auth, async (request) => {
    const config = await runtimeConfig(db);
    const rows = await db.userAchievement.findMany({
      where: { userId: principal(request).id },
    });
    return {
      data: {
        items: config.value.achievements.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          unlockedAt:
            rows
              .find((r) => r.achievementId === a.id)
              ?.unlockedAt.toISOString() ?? null,
        })),
      },
    };
  });
}
