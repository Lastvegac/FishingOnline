import { z } from 'zod';
import {
  outfitInputSchema,
  outfitSchema,
  fashionCollectionSchema,
  fashionCollectionOrderSchema,
  fashionEventInputSchema,
  fashionAdminItemSchema,
} from '@fwo/contracts';
import type { OutfitDto } from '@fwo/contracts';
import type { Context } from '../../types.js';
import type { Tx } from '../../db.js';
import { principal } from '../../types.js';
import { json } from '../../db.js';
import { assert } from '../../lib/errors.js';
import { mutation, ledger, event } from '../../lib/transaction.js';
import { getPlayer, ensureNoActiveSession } from '../players/service.js';
import {
  validateWardrobe,
  applyEquipment,
  getCharacter,
  auditCharacter,
  catalog,
  diamondLedger,
} from './service.js';

const auth = { config: { auth: true }, schema: { tags: ['Fashion'] } };
const admin = {
  config: { auth: true, roles: ['SUPER_ADMIN', 'GAME_ADMIN'] },
  schema: { tags: ['Fashion admin'] },
};
const analyst = {
  config: { auth: true, roles: ['SUPER_ADMIN', 'GAME_ADMIN', 'ANALYST'] },
  schema: { tags: ['Fashion admin'] },
};
const idOf = (params: unknown) =>
  z.strictObject({ id: z.uuid() }).parse(params).id;

async function outfitDto(
  tx: Tx,
  id: string,
  viewer: string,
): Promise<OutfitDto> {
  const row = await tx.playerOutfit.findUniqueOrThrow({
    where: { id },
    include: { likes: true },
  });
  const profile = await tx.userProfile.findUniqueOrThrow({
    where: { userId: row.userId },
  });
  return outfitSchema.parse({
    ...row,
    username: profile.username,
    updatedAt: row.updatedAt.toISOString(),
    likes: row.likes.length,
    liked: row.likes.some((l) => l.userId === viewer),
    following: !!(await tx.fashionFollow.findUnique({
      where: { userId_targetId: { userId: viewer, targetId: row.userId } },
    })),
  });
}
async function outfitCapacity(tx: Tx, userId: string, now: number) {
  const memberships = await tx.fashionPass.findMany({
    where: {
      kind: 'MEMBERSHIP',
      active: true,
      startsAt: { lte: new Date(now) },
      endsAt: { gt: new Date(now) },
    },
    select: { id: true },
  });
  const entitled =
    memberships.length > 0 &&
    (await tx.userGrant.findFirst({
      where: {
        userId,
        key: 'FASHION_PASS_PURCHASE',
        periodKey: { in: memberships.map((m) => m.id) },
      },
      select: { id: true },
    }));
  return entitled ? 20 : 10;
}
export function registerFashion(ctx: Context) {
  const { app, db, now } = ctx;
  app.get('/api/v1/fashion/wallet', auth, async (req) => {
    const userId = principal(req).id;
    const wallet = await db.wallet.findUniqueOrThrow({ where: { userId } });
    const tx = await db.diamondTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      data: {
        gold: wallet.balanceGold.toString(),
        diamonds: wallet.balanceDiamonds.toString(),
        transactions: tx.map((t) => ({
          id: t.id,
          amount: t.amount.toString(),
          reason: t.reason,
          createdAt: t.createdAt.toISOString(),
        })),
      },
    };
  });
  app.get('/api/v1/fashion/outfits', auth, async (req) => {
    const userId = principal(req).id;
    const q = z
      .strictObject({ community: z.enum(['all', 'following']).optional() })
      .parse(req.query);
    const follows =
      q.community === 'following'
        ? await db.fashionFollow.findMany({
            where: { userId },
            select: { targetId: true },
          })
        : [];
    const rows = await db.playerOutfit.findMany({
      where: q.community
        ? {
            isPublic: true,
            ...(q.community === 'following'
              ? { userId: { in: follows.map((f) => f.targetId) } }
              : {}),
          }
        : { userId },
      orderBy: { updatedAt: 'desc' },
      take: q.community ? 50 : 20,
    });
    return {
      data: {
        items: await Promise.all(rows.map((r) => outfitDto(db, r.id, userId))),
        capacity: await outfitCapacity(db, userId, now()),
      },
    };
  });
  app.get('/api/v1/fashion/outfits/:id', auth, async (req) => {
    const id = idOf(req.params),
      userId = principal(req).id;
    const row = await db.playerOutfit.findUnique({ where: { id } });
    assert(row && (row.userId === userId || row.isPublic), 404, 'NOT_FOUND');
    return { data: await outfitDto(db, id, userId) };
  });
  for (const method of ['POST', 'PUT'] as const)
    app.route({
      method,
      url:
        method === 'POST'
          ? '/api/v1/fashion/outfits'
          : '/api/v1/fashion/outfits/:id',
      ...auth,
      handler: async (req) => {
        const input = outfitInputSchema.parse(req.body),
          id = method === 'PUT' ? idOf(req.params) : null;
        return {
          data: await mutation(
            ctx,
            req,
            `/fashion/outfits/${id ?? 'new'}`,
            async (tx, userId) => {
              await validateWardrobe(
                tx,
                userId,
                input.equipment,
                input.appearance,
                now(),
              );
              const prior = id
                ? await tx.playerOutfit.findFirst({ where: { id, userId } })
                : null;
              assert(!id || prior, 404, 'NOT_FOUND');
              assert(
                (prior?.version ?? 0) === input.expectedVersion,
                409,
                'VERSION_CONFLICT',
              );
              if (!prior)
                assert(
                  (await tx.playerOutfit.count({ where: { userId } })) <
                    (await outfitCapacity(tx, userId, now())),
                  422,
                  'OUTFIT_LIMIT',
                  'Tủ đồ đã đạt giới hạn bộ phối.',
                );
              const data = {
                name: input.name,
                appearance: json(input.appearance),
                equipment: json(input.equipment),
                isPublic: input.isPublic,
                updatedAt: new Date(now()),
              };
              const row = prior
                ? await tx.playerOutfit.update({
                    where: { id: prior.id },
                    data: { ...data, version: { increment: 1 } },
                  })
                : await tx.playerOutfit.create({ data: { ...data, userId } });
              await event(
                tx,
                userId,
                'outfit_saved',
                { outfitId: row.id, isPublic: row.isPublic },
                now(),
              );
              return outfitDto(tx, row.id, userId);
            },
          ),
        };
      },
    });
  app.delete('/api/v1/fashion/outfits/:id', auth, async (req) => {
    const id = idOf(req.params),
      input = z
        .strictObject({ expectedVersion: z.number().int().positive() })
        .parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        `/fashion/outfits/${id}/delete`,
        async (tx, userId) => {
          const deleted = await tx.playerOutfit.deleteMany({
            where: { id, userId, version: input.expectedVersion },
          });
          assert(deleted.count === 1, 409, 'VERSION_CONFLICT');
          return { ok: true };
        },
      ),
    };
  });
  app.post('/api/v1/fashion/outfits/:id/equip', auth, async (req) => {
    const id = idOf(req.params),
      input = z
        .strictObject({ expectedCharacterVersion: z.number().int().positive() })
        .parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        `/fashion/outfits/${id}/equip`,
        async (tx, userId) => {
          await ensureNoActiveSession(tx, userId);
          const outfit = await tx.playerOutfit.findFirst({
              where: { id, userId },
            }),
            before = await getCharacter(tx, userId);
          assert(outfit && before, 404, 'NOT_FOUND');
          assert(
            before.version === input.expectedCharacterVersion,
            409,
            'CHARACTER_VERSION_CONFLICT',
          );
          const dto = await outfitDto(tx, id, userId),
            inventory = await validateWardrobe(
              tx,
              userId,
              dto.equipment,
              dto.appearance,
              now(),
            );
          await tx.playerCharacter.update({
            where: { userId },
            data: {
              appearance: json(dto.appearance),
              version: { increment: 1 },
              updatedAt: new Date(now()),
            },
          });
          await applyEquipment(tx, before.id, inventory, now());
          const after = await getCharacter(tx, userId);
          await auditCharacter(
            tx,
            userId,
            'OUTFIT_EQUIP',
            before.id,
            before,
            after,
            now(),
          );
          return after;
        },
      ),
    };
  });
  app.post('/api/v1/fashion/outfits/:id/like', auth, async (req) => {
    const id = idOf(req.params),
      input = z.strictObject({ liked: z.boolean() }).parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        `/fashion/outfits/${id}/like`,
        async (tx, userId) => {
          assert(
            await tx.playerOutfit.findFirst({
              where: { id, isPublic: true, userId: { not: userId } },
            }),
            404,
            'NOT_FOUND',
          );
          if (input.liked)
            await tx.outfitLike.upsert({
              where: { outfitId_userId: { outfitId: id, userId } },
              create: { outfitId: id, userId },
              update: {},
            });
          else
            await tx.outfitLike.deleteMany({ where: { outfitId: id, userId } });
          return outfitDto(tx, id, userId);
        },
      ),
    };
  });
  app.post('/api/v1/fashion/players/:id/follow', auth, async (req) => {
    const id = idOf(req.params),
      input = z.strictObject({ following: z.boolean() }).parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        `/fashion/players/${id}/follow`,
        async (tx, userId) => {
          assert(
            id !== userId &&
              (await tx.user.findFirst({
                where: { id, status: 'ACTIVE', deletedAt: null },
              })),
            404,
            'NOT_FOUND',
          );
          if (input.following)
            await tx.fashionFollow.upsert({
              where: { userId_targetId: { userId, targetId: id } },
              create: { userId, targetId: id },
              update: {},
            });
          else
            await tx.fashionFollow.deleteMany({
              where: { userId, targetId: id },
            });
          return { following: input.following };
        },
      ),
    };
  });
  app.get('/api/v1/fashion/collections', auth, async () => ({
    data: {
      items: (
        await db.fashionCollection.findMany({ where: { active: true } })
      ).map((c) => fashionCollectionSchema.parse(c)),
    },
  }));
  app.post('/api/v1/fashion/collections/order', auth, async (req) => {
    const input = fashionCollectionOrderSchema.parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        '/fashion/collections/order',
        async (tx, userId, key) => {
          await tx.$queryRaw`SELECT id FROM fashion_collections WHERE id=${input.collectionId} FOR UPDATE`;
          const row = await tx.fashionCollection.findUnique({
            where: { id: input.collectionId },
          });
          assert(
            row?.active && row.version === input.expectedVersion,
            409,
            'PRICE_CHANGED',
          );
          const collection = fashionCollectionSchema.parse(row);
          await tx.$queryRaw`SELECT id FROM character_cosmetics WHERE id=ANY(${collection.itemIds}::text[]) ORDER BY id FOR UPDATE`;
          const available = (await catalog(tx, userId)).cosmetics;
          const items = collection.itemIds.map((id) =>
            available.find((i) => i.id === id),
          );
          assert(
            items.every(
              (i) =>
                i &&
                i.active &&
                (!i.startsAt || Date.parse(i.startsAt) <= now()) &&
                (!i.endsAt || Date.parse(i.endsAt) > now()),
            ),
            422,
            'COSMETIC_LOCKED',
          );
          const missing = items.filter((i) => i && !i.owned).map((i) => i!);
          assert(missing.length > 0, 409, 'ALREADY_OWNED');
          const player = await getPlayer(tx, userId);
          assert(
            missing.every((i) => i.minLevel <= player.level),
            422,
            'LEVEL_REQUIRED',
          );
          assert(
            missing.every((i) => i.unlockType === input.currency),
            422,
            'INVALID_CURRENCY',
          );
          const total =
            (missing.reduce(
              (n, i) =>
                n +
                BigInt(
                  input.currency === 'GOLD' ? i.priceGold : i.priceDiamonds,
                ),
              0n,
            ) *
              BigInt(100 - collection.discountPercent)) /
            100n;
          assert(
            total.toString() ===
              (input.expectedTotal ?? input.expectedTotalGold),
            409,
            'PRICE_CHANGED',
          );
          if (input.currency === 'GOLD')
            await ledger(tx, userId, -total, 'FASHION_COLLECTION', key, now());
          else
            await diamondLedger(
              tx,
              userId,
              -total,
              'FASHION_COLLECTION',
              `COLLECTION:${key}`,
              now(),
            );
          for (const item of missing) {
            await tx.userInventory.create({
              data: { userId, cosmeticId: item.id, quantity: 1 },
            });
            await event(
              tx,
              userId,
              'cosmetic_purchased',
              {
                itemId: item.id,
                currency: input.currency,
                collectionId: row.id,
              },
              now(),
            );
          }
          await event(
            tx,
            userId,
            'collection_purchased',
            {
              collectionId: row.id,
              price: total.toString(),
              currency: input.currency,
            },
            now(),
          );
          return { player: await getPlayer(tx, userId) };
        },
      ),
    };
  });
  app.get('/api/v1/fashion/events', auth, async (req) => {
    const userId = principal(req).id;
    const rows = await db.fashionEvent.findMany({
      where: { active: true },
      orderBy: { startsAt: 'desc' },
      take: 20,
      include: {
        entries: { take: 50, orderBy: { id: 'asc' }, include: { votes: true } },
      },
    });
    const items = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        rewardGold: row.rewardGold.toString(),
        entered: !!(await db.fashionEventEntry.findUnique({
          where: { eventId_userId: { eventId: row.id, userId } },
        })),
        claimed: !!(
          await db.fashionEventEntry.findUnique({
            where: { eventId_userId: { eventId: row.id, userId } },
          })
        )?.claimedAt,
        entries: await Promise.all(
          row.entries.map(async (e) => ({
            id: e.id,
            userId: e.userId,
            username: (
              await db.userProfile.findUniqueOrThrow({
                where: { userId: e.userId },
              })
            ).username,
            outfit: e.outfitSnapshot,
            votes: e.votes.length,
            voted: e.votes.some((v) => v.userId === userId),
          })),
        ),
      })),
    );
    return { data: { items } };
  });
  app.post('/api/v1/fashion/events/:id/enter', auth, async (req) => {
    const id = idOf(req.params),
      input = z.strictObject({ outfitId: z.uuid() }).parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        `/fashion/events/${id}/enter`,
        async (tx, userId) => {
          await tx.$queryRaw`SELECT id FROM fashion_events WHERE id=${id}::uuid FOR UPDATE`;
          const e = await tx.fashionEvent.findUnique({ where: { id } });
          assert(
            e?.active &&
              e.startsAt.getTime() <= now() &&
              now() < e.endsAt.getTime(),
            422,
            'EVENT_CLOSED',
          );
          const outfit = await tx.playerOutfit.findFirst({
            where: { id: input.outfitId, userId },
          });
          assert(outfit, 404, 'NOT_FOUND');
          const dto = await outfitDto(tx, outfit.id, userId);
          await validateWardrobe(
            tx,
            userId,
            dto.equipment,
            dto.appearance,
            now(),
          );
          assert(
            !(await tx.fashionEventEntry.findUnique({
              where: { eventId_userId: { eventId: id, userId } },
            })),
            409,
            'ALREADY_ENTERED',
          );
          await tx.fashionEventEntry.create({
            data: { eventId: id, userId, outfitSnapshot: json(dto) },
          });
          return { ok: true };
        },
      ),
    };
  });
  app.post('/api/v1/fashion/events/:id/vote', auth, async (req) => {
    const id = idOf(req.params),
      input = z.strictObject({ entryId: z.uuid() }).parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        `/fashion/events/${id}/vote`,
        async (tx, userId) => {
          await tx.$queryRaw`SELECT id FROM fashion_events WHERE id=${id}::uuid FOR UPDATE`;
          const e = await tx.fashionEvent.findUnique({ where: { id } });
          assert(
            e?.active &&
              e.startsAt.getTime() <= now() &&
              now() < e.endsAt.getTime(),
            422,
            'EVENT_CLOSED',
          );
          assert(
            await tx.fashionEventEntry.findFirst({
              where: {
                id: input.entryId,
                eventId: id,
                userId: { not: userId },
              },
            }),
            422,
            'INVALID_VOTE',
          );
          await tx.fashionEventVote.upsert({
            where: { eventId_userId: { eventId: id, userId } },
            create: { eventId: id, userId, entryId: input.entryId },
            update: { entryId: input.entryId },
          });
          return { ok: true };
        },
      ),
    };
  });
  app.post('/api/v1/fashion/events/:id/claim', auth, async (req) => {
    const id = idOf(req.params);
    z.strictObject({}).parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        `/fashion/events/${id}/claim`,
        async (tx, userId) => {
          await tx.$queryRaw`SELECT id FROM fashion_events WHERE id=${id}::uuid FOR UPDATE`;
          const e = await tx.fashionEvent.findUnique({ where: { id } }),
            entry = await tx.fashionEventEntry.findUnique({
              where: { eventId_userId: { eventId: id, userId } },
            });
          assert(
            e?.active &&
              now() >= e.endsAt.getTime() &&
              entry &&
              !entry.claimedAt,
            422,
            'REWARD_UNAVAILABLE',
          );
          // Participation rewards are explicit; votes never change fishing power.
          await ledger(
            tx,
            userId,
            e.rewardGold,
            'FASHION_EVENT',
            entry.id,
            now(),
          );
          if (e.rewardCosmeticId)
            await tx.userInventory.upsert({
              where: {
                userId_cosmeticId: { userId, cosmeticId: e.rewardCosmeticId },
              },
              create: { userId, cosmeticId: e.rewardCosmeticId, quantity: 1 },
              update: {},
            });
          await tx.fashionEventEntry.update({
            where: { id: entry.id },
            data: { claimedAt: new Date(now()) },
          });
          return { player: await getPlayer(tx, userId) };
        },
      ),
    };
  });
  // Admin editing uses known modular assets, never arbitrary client URLs or textures.
  app.get('/api/v1/admin/fashion', analyst, async (req) => {
    const [cat, collections, events, passes] = await Promise.all([
      catalog(db, principal(req).id),
      db.fashionCollection.findMany(),
      db.fashionEvent.findMany(),
      db.fashionPass.findMany(),
    ]);
    return {
      data: {
        ...cat,
        collections,
        passes: passes.map((p) => ({
          ...p,
          startsAt: p.startsAt.toISOString(),
          endsAt: p.endsAt.toISOString(),
          priceDiamonds: p.priceDiamonds.toString(),
        })),
        events: events.map((e) => ({
          ...e,
          startsAt: e.startsAt.toISOString(),
          endsAt: e.endsAt.toISOString(),
          rewardGold: e.rewardGold.toString(),
        })),
      },
    };
  });
  app.put('/api/v1/admin/fashion/items', admin, async (req) => {
    const input = fashionAdminItemSchema.parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        '/admin/fashion/items',
        async (tx, userId) => {
          await tx.$queryRaw`SELECT id FROM character_cosmetics WHERE id=${input.id} FOR UPDATE`;
          const before = await tx.characterCosmetic.findUnique({
            where: { id: input.id },
          });
          assert(
            (before?.version ?? 0) === input.expectedVersion,
            409,
            'VERSION_CONFLICT',
          );
          assert(
            await tx.characterCosmetic.findFirst({
              where: { assetId: input.assetId, slot: input.slot },
            }),
            422,
            'UNKNOWN_ASSET',
          );
          assert(
            (input.unlockType === 'GOLD' && BigInt(input.priceGold) > 0n) ||
              (input.unlockType === 'DIAMOND' &&
                BigInt(input.priceDiamonds) > 0n) ||
              (['FREE', 'LEVEL'].includes(input.unlockType) &&
                input.priceGold === '0' &&
                input.priceDiamonds === '0'),
            422,
            'INVALID_PRICE',
          );
          assert(
            !input.startsAt || !input.endsAt || input.startsAt < input.endsAt,
            422,
            'INVALID_SALE_WINDOW',
          );
          const { expectedVersion: _expectedVersion, reason, ...rest } = input;
          const data = {
            ...rest,
            priceGold: BigInt(rest.priceGold),
            priceDiamonds: BigInt(rest.priceDiamonds),
            startsAt: rest.startsAt ? new Date(rest.startsAt) : null,
            endsAt: rest.endsAt ? new Date(rest.endsAt) : null,
          };
          const row = await tx.characterCosmetic.upsert({
            where: { id: input.id },
            create: data,
            update: { ...data, version: { increment: 1 } },
          });
          await auditCharacter(
            tx,
            userId,
            'FASHION_ITEM',
            row.id,
            before,
            { ...row, reason },
            now(),
          );
          return { id: row.id };
        },
      ),
    };
  });
  app.put('/api/v1/admin/fashion/collections', admin, async (req) => {
    const input = fashionCollectionSchema
      .extend({ reason: z.string().min(5).max(1000) })
      .parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        '/admin/fashion/collections',
        async (tx, userId) => {
          await tx.$queryRaw`SELECT id FROM fashion_collections WHERE id=${input.id} FOR UPDATE`;
          const before = await tx.fashionCollection.findUnique({
            where: { id: input.id },
          });
          assert(
            (before?.version ?? 0) === input.version - 1,
            409,
            'VERSION_CONFLICT',
          );
          assert(
            new Set(input.itemIds).size === input.itemIds.length &&
              (await tx.characterCosmetic.count({
                where: { id: { in: input.itemIds } },
              })) === input.itemIds.length,
            422,
            'INVALID_COLLECTION',
          );
          const { reason, ...data } = input;
          const row = await tx.fashionCollection.upsert({
            where: { id: input.id },
            create: { ...data, itemIds: json(data.itemIds) },
            update: { ...data, itemIds: json(data.itemIds) },
          });
          await auditCharacter(
            tx,
            userId,
            'FASHION_COLLECTION',
            row.id,
            before,
            { ...row, reason },
            now(),
          );
          return row;
        },
      ),
    };
  });
  app.post('/api/v1/admin/fashion/events', admin, async (req) => {
    const input = fashionEventInputSchema
      .safeExtend({
        id: z.uuid().optional(),
        reason: z.string().min(5).max(1000),
      })
      .parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        '/admin/fashion/events',
        async (tx, userId) => {
          if (input.id)
            await tx.$queryRaw`SELECT id FROM fashion_events WHERE id=${input.id}::uuid FOR UPDATE`;
          const before = input.id
            ? await tx.fashionEvent.findUnique({
                where: { id: input.id },
                include: { _count: { select: { entries: true } } },
              })
            : null;
          assert(
            (before?.version ?? 0) === input.expectedVersion,
            409,
            'VERSION_CONFLICT',
          );
          assert(
            !before ||
              (before.startsAt.getTime() > now() &&
                before._count.entries === 0),
            409,
            'EVENT_ALREADY_STARTED',
          );
          assert(
            !input.rewardCosmeticId ||
              (await tx.characterCosmetic.findUnique({
                where: { id: input.rewardCosmeticId },
              })),
            422,
            'INVALID_COSMETIC',
          );
          const {
            id: _id,
            reason,
            expectedVersion: _expectedVersion,
            ...rest
          } = input;
          const data = {
            ...rest,
            startsAt: new Date(rest.startsAt),
            endsAt: new Date(rest.endsAt),
            rewardGold: BigInt(rest.rewardGold),
          };
          const row = before
            ? await tx.fashionEvent.update({
                where: { id: before.id },
                data: { ...data, version: { increment: 1 } },
              })
            : await tx.fashionEvent.create({ data });
          await auditCharacter(
            tx,
            userId,
            'FASHION_EVENT',
            row.id,
            before,
            { ...row, reason },
            now(),
          );
          return { id: row.id };
        },
      ),
    };
  });
  app.get('/api/v1/admin/fashion/metrics', analyst, async () => {
    const since = new Date(now() - 30 * 86400000);
    const monthSince = new Date(now());
    monthSince.setUTCMonth(monthSince.getUTCMonth() - 11, 1);
    monthSince.setUTCHours(0, 0, 0, 0);
    const paid = await db.paymentOrder.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: monthSince },
        items: { some: { kind: 'DIAMOND' } },
      },
      select: { userId: true, totalAmount: true, paidAt: true },
    });
    const gold = await db.walletTransaction.findMany({
      where: { createdAt: { gte: since } },
      select: { deltaGold: true, reason: true, createdAt: true },
    });
    const diamonds = await db.diamondTransaction.findMany({
      where: { createdAt: { gte: since } },
      select: { amount: true, createdAt: true, reason: true, userId: true },
    });
    const purchases = await db.analyticsEvent.findMany({
      where: { eventName: 'cosmetic_purchased', occurredAt: { gte: since } },
      select: { properties: true, userId: true },
    });
    const totals = new Map<
      string,
      {
        day: string;
        goldCreated: bigint;
        goldSpent: bigint;
        diamondsAdded: bigint;
        diamondsSpent: bigint;
        revenueVnd: bigint;
      }
    >();
    const day = (date: Date) => {
      const k = date.toISOString().slice(0, 10);
      if (!totals.has(k))
        totals.set(k, {
          day: k,
          goldCreated: 0n,
          goldSpent: 0n,
          diamondsAdded: 0n,
          diamondsSpent: 0n,
          revenueVnd: 0n,
        });
      return totals.get(k)!;
    };
    for (const t of gold) {
      const d = day(t.createdAt);
      if (t.deltaGold > 0n) d.goldCreated += t.deltaGold;
      else d.goldSpent -= t.deltaGold;
    }
    for (const t of diamonds) {
      const d = day(t.createdAt);
      if (t.amount > 0n) d.diamondsAdded += t.amount;
      else d.diamondsSpent -= t.amount;
    }
    const top: Record<string, number> = {};
    for (const p of purchases) {
      const id = (p.properties as { itemId: string }).itemId;
      top[id] = (top[id] ?? 0) + 1;
    }
    const playerCount = await db.user.count();
    const months = new Map<string, bigint>();
    let revenue = 0n;
    const payers = new Set<string>();
    for (const order of paid) {
      const date = order.paidAt!;
      const month = date.toISOString().slice(0, 7);
      months.set(month, (months.get(month) ?? 0n) + order.totalAmount);
      if (date >= since) {
        day(date).revenueVnd += order.totalAmount;
        revenue += order.totalAmount;
        payers.add(order.userId);
      }
    }
    return {
      data: {
        days: [...totals.values()].sort((a, b) => a.day.localeCompare(b.day)),
        months: [...months]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, revenueVnd]) => ({
            month,
            revenueVnd: revenueVnd.toString(),
          })),
        payingPlayers: payers.size,
        buyers: new Set(purchases.map((p) => p.userId)).size,
        players: playerCount,
        topItems: Object.entries(top)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
        revenueVnd: revenue.toString(),
      },
    };
  });
}
