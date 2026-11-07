import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  characterSaveSchema,
  cosmeticOrderSchema,
  presenceJoinSchema,
  presenceMoveSchema,
  presenceLeaveSchema,
} from '@fwo/contracts';
import type { CharacterAnimation } from '@fwo/contracts';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import { json } from '../../db.js';
import { assert } from '../../lib/errors.js';
import { mutation, ledger, lockPlayer, event } from '../../lib/transaction.js';
import {
  getPlayer,
  ensureNoActiveSession,
  levelForXp,
} from '../players/service.js';
import {
  getCharacter,
  catalog,
  validateWardrobe,
  applyEquipment,
  diamondLedger,
  auditCharacter,
} from './service.js';

const auth = { config: { auth: true }, schema: { tags: ['Characters'] } };
export function registerCharacters(ctx: Context) {
  const { app, db, now } = ctx;
  app.get(
    '/api/v1/characters/me',
    { ...auth, config: { auth: true, fishingAccess: 'context' } },
    async (req) => ({
      data: await getCharacter(db, principal(req).id),
    }),
  );
  app.get('/api/v1/characters/catalog', auth, async (req) => ({
    data: await catalog(db, principal(req).id),
  }));
  app.get('/api/v1/inventory/cosmetics', auth, async (req) => ({
    data: {
      items: (await catalog(db, principal(req).id)).cosmetics.filter(
        (c) => c.owned,
      ),
    },
  }));
  app.get('/api/v1/shop/cosmetics', auth, async (req) => ({
    data: { items: (await catalog(db, principal(req).id)).cosmetics },
  }));
  app.put('/api/v1/characters/me', auth, async (req) => {
    const input = characterSaveSchema.parse(req.body);
    return {
      data: await mutation(ctx, req, '/characters/me', async (tx, userId) => {
        await ensureNoActiveSession(tx, userId);
        const before = await getCharacter(tx, userId);
        assert(
          (before?.version ?? 0) === input.expectedVersion,
          409,
          'CHARACTER_VERSION_CONFLICT',
          'Nhân vật đã thay đổi. Hãy tải lại trước khi lưu.',
        );
        assert(
          await tx.characterPreset.findUnique({
            where: { id: input.presetId },
          }),
          422,
          'INVALID_PRESET',
        );
        const inventory = await validateWardrobe(
          tx,
          userId,
          input.equipment,
          input.appearance,
          now(),
        );
        const row = await tx.playerCharacter.upsert({
          where: { userId },
          create: {
            userId,
            name: input.name,
            presetId: input.presetId,
            appearance: json(input.appearance),
            updatedAt: new Date(now()),
          },
          update: {
            name: input.name,
            presetId: input.presetId,
            appearance: json(input.appearance),
            version: { increment: 1 },
            updatedAt: new Date(now()),
          },
        });
        await applyEquipment(tx, row.id, inventory, now());
        const after = await getCharacter(tx, userId);
        await auditCharacter(
          tx,
          userId,
          'CHARACTER_SAVE',
          row.id,
          before,
          after,
          now(),
        );
        return after;
      }),
    };
  });
  app.post('/api/v1/shop/cosmetics/orders', auth, async (req) => {
    const input = cosmeticOrderSchema.parse(req.body);
    return {
      data: await mutation(
        ctx,
        req,
        '/shop/cosmetics/orders',
        async (tx, userId, key) => {
          await tx.$queryRaw`SELECT id FROM character_cosmetics WHERE id=${input.cosmeticId} FOR UPDATE`;
          const item = await tx.characterCosmetic.findUnique({
            where: { id: input.cosmeticId },
          });
          assert(
            item?.active &&
              (!item.startsAt || item.startsAt.getTime() <= now()) &&
              (!item.endsAt || item.endsAt.getTime() > now()),
            422,
            'COSMETIC_LOCKED',
            'Vật phẩm thời trang không khả dụng.',
          );
          const price =
            input.currency === 'GOLD' ? item.priceGold : item.priceDiamonds;
          assert(
            item.version === input.expectedVersion &&
              price.toString() === input.expectedPrice,
            409,
            'PRICE_CHANGED',
          );
          assert(
            (input.currency === 'GOLD' && item.unlockType === 'GOLD') ||
              (input.currency === 'DIAMOND' && item.unlockType === 'DIAMOND'),
            422,
            'INVALID_CURRENCY',
          );
          assert(
            (await getPlayer(tx, userId)).level >= item.minLevel,
            422,
            'LEVEL_REQUIRED',
          );
          assert(
            !(await tx.userInventory.findUnique({
              where: { userId_cosmeticId: { userId, cosmeticId: item.id } },
            })),
            409,
            'ALREADY_OWNED',
          );
          if (input.currency === 'GOLD')
            await ledger(tx, userId, -price, 'COSMETIC_PURCHASE', key, now());
          else
            await diamondLedger(
              tx,
              userId,
              -price,
              'COSMETIC_PURCHASE',
              `COSMETIC:${key}`,
              now(),
            );
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
              price: price.toString(),
              version: item.version,
            },
            now(),
          );
          return {
            player: await getPlayer(tx, userId),
            catalog: await catalog(tx, userId),
          };
        },
      ),
    };
  });
  // Presence is a 15-second lease, bounded to a small room. All fishing actions
  // come from FishingSession; clients can only request cosmetic locomotion.
  app.post('/api/v1/characters/presence', auth, async (req) => {
    const input = presenceJoinSchema.parse(req.body),
      userId = principal(req).id;
    return {
      data: await db.$transaction(async (tx) => {
        await lockPlayer(tx, userId);
        assert(await getCharacter(tx, userId), 422, 'CHARACTER_REQUIRED');
        await tx.$queryRaw`SELECT id FROM fishing_locations WHERE id=${input.locationId}::uuid FOR UPDATE`;
        const location = await tx.fishingLocation.findUnique({
          where: { id: input.locationId },
        });
        assert(
          location?.active &&
            (await getPlayer(tx, userId)).level >= location.minLevel,
          422,
          'LOCATION_LOCKED',
        );
        const count = await tx.lakePresence.count({
          where: {
            locationId: input.locationId,
            userId: { not: userId },
            updatedAt: { gt: new Date(now() - 15000) },
          },
        });
        assert(
          count < 12,
          409,
          'LAKE_FULL',
          'Hồ đã đủ người chơi. Vui lòng thử lại sau.',
        );
        const row = await tx.lakePresence.upsert({
          where: { userId },
          create: {
            userId,
            locationId: input.locationId,
            leaseId: randomUUID(),
            updatedAt: new Date(now()),
            x: -8 + (count % 6) * 0.75,
            z: 2 + Math.floor(count / 6) * 1.2,
          },
          update: {
            locationId: input.locationId,
            leaseId: randomUUID(),
            sequence: 0,
            updatedAt: new Date(now()),
            x: -8 + (count % 6) * 0.75,
            z: 2 + Math.floor(count / 6) * 1.2,
            action: 'IDLE',
          },
        });
        return {
          leaseId: row.leaseId,
          sequence: row.sequence,
          x: row.x,
          z: row.z,
        };
      }),
    };
  });
  app.patch('/api/v1/characters/presence', auth, async (req) => {
    const input = presenceMoveSchema.parse(req.body),
      userId = principal(req).id;
    return {
      data: await db.$transaction(async (tx) => {
        await lockPlayer(tx, userId);
        const p = await tx.lakePresence.findUnique({ where: { userId } });
        assert(
          p &&
            p.leaseId === input.leaseId &&
            p.updatedAt.getTime() > now() - 15000,
          409,
          'PRESENCE_EXPIRED',
        );
        assert(input.sequence > p.sequence, 409, 'STALE_MOVEMENT');
        const dt = Math.max(
          0,
          Math.min(3, (now() - p.updatedAt.getTime()) / 1000),
        );
        assert(
          Math.hypot(input.x - p.x, input.z - p.z) <= dt * 3 + 0.05,
          422,
          'MOVEMENT_TOO_FAST',
        );
        const active = await tx.fishingSession.findFirst({
          where: { userId, state: { not: 'FINISHED' } },
        });
        assert(
          !active || Math.hypot(input.x - p.x, input.z - p.z) < 0.01,
          409,
          'ACTIVE_FISHING_SESSION',
        );
        await tx.lakePresence.update({
          where: { userId },
          data: {
            sequence: input.sequence,
            x: input.x,
            z: input.z,
            action: input.action,
            updatedAt: new Date(now()),
          },
        });
        return { ok: true };
      }),
    };
  });
  app.delete('/api/v1/characters/presence', auth, async (req) => {
    const input = presenceLeaveSchema.parse(req.body);
    await db.lakePresence.deleteMany({
      where: { userId: principal(req).id, leaseId: input.leaseId },
    });
    return { data: { ok: true } };
  });
  app.get('/api/v1/locations/:id/characters', auth, async (req) => {
    const id = z.uuid().parse((req.params as { id: string }).id),
      userId = principal(req).id;
    const member = await db.lakePresence.findUnique({ where: { userId } });
    assert(
      member?.locationId === id && member.updatedAt.getTime() > now() - 15000,
      403,
      'JOIN_LAKE_FIRST',
    );
    const rows = await db.lakePresence.findMany({
      where: {
        locationId: id,
        updatedAt: { gt: new Date(now() - 15000) },
        user: { status: 'ACTIVE', deletedAt: null },
      },
      include: {
        user: {
          include: {
            profile: true,
            fishingSessions: {
              where: { locationId: id, state: { not: 'FINISHED' } },
              take: 1,
            },
          },
        },
      },
      orderBy: { userId: 'asc' },
      take: 12,
    });
    const animations: Record<string, CharacterAnimation> = {
      IDLE: 'STAND_FISHING',
      CASTING: 'CAST',
      WAITING: 'WAIT',
      BITE: 'BITE',
      HOOKING: 'HOOK',
      FIGHTING: 'FIGHT',
      REELING: 'REEL',
      CAUGHT: 'HOLD_FISH',
      ESCAPED: 'FAIL',
    };
    const items = await Promise.all(
      rows.map(async (p) => {
        const c = await getCharacter(db, p.userId);
        if (!c) return null;
        const state = p.user.fishingSessions[0]?.state;
        return {
          userId: p.userId,
          username: p.user.profile!.username,
          character: c,
          x: p.x,
          z: p.z,
          animation: state
            ? (animations[state] ?? 'IDLE')
            : (p.action as CharacterAnimation),
          level: levelForXp(p.user.profile!.totalXp),
          totalFish: p.user.profile!.totalFish,
          largestFishG: p.user.profile!.largestFishG,
        };
      }),
    );
    return {
      data: {
        serverTime: new Date(now()).toISOString(),
        items: items.filter((i) => i !== null),
      },
    };
  });
}
