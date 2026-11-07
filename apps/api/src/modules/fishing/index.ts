import { createHash, randomInt } from 'node:crypto';
import { registerFishingCommunity } from './community.js';
import { requestUtcOffset } from '../../lib/time-zone.js';
import type { FishingSession } from '@prisma/client';
import { z } from 'zod';
import {
  createSessionSchema,
  castSchema,
  hookSchema,
  reelSchema,
  completeSchema,
} from '@fwo/contracts';
import type { CatchDto, SessionDto } from '@fwo/contracts';
import {
  FISH_EXCHANGE_DAILY_CAP,
  FISH_EXCHANGE_RATE_BPS,
  toPublicFish,
  conditionsFor,
  tackleFor,
  baitMassG,
} from '@fwo/game-config';
import {
  createEngine,
  castEngine,
  advanceEngine,
  hookEngine,
  reelEngine,
  finishEngine,
  abandonEngine,
  toPublicEngine,
  EngineError,
} from '@fwo/game-core';
import type { EngineState } from '@fwo/game-core';
import type { GameConfig } from '@fwo/game-config';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import type { Tx } from '../../db.js';
import { json } from '../../db.js';
import { assert, ApiError } from '../../lib/errors.js';
import { lockPlayer, mutation, ledger, event } from '../../lib/transaction.js';
import { grantFishingAccess } from '../auth/fishing-access.js';
import {
  runtimeConfig,
  getInventory,
  getPlayer,
  updateCatchProgress,
  levelForXp,
} from '../players/service.js';

const auth = { config: { auth: true }, schema: { tags: ['Fishing'] } };
const continuation = {
  ...auth,
  config: { auth: true, fishingAccess: 'session' as const },
};
const csprng = () => randomInt(0, 4294967296) / 4294967296;
const stateOf = (row: FishingSession) =>
  row.simulation as unknown as EngineState;
async function save(tx: Tx, row: FishingSession, state: EngineState) {
  await tx.fishingSession.update({
    where: { id: row.id },
    data: {
      state: state.state,
      version: state.version,
      simulation: json(state),
      ...(state.castEndsAt
        ? {
            castAt: new Date(
              state.castEndsAt - (state.simulation?.cast?.flightMs ?? 700),
            ),
          }
        : {}),
      ...(state.biteAt ? { biteAt: new Date(state.biteAt) } : {}),
      ...(state.hookDeadline
        ? { hookDeadline: new Date(state.hookDeadline) }
        : {}),
      ...(state.simulatedAt ? { lastTickAt: new Date(state.simulatedAt) } : {}),
      ...(state.state === 'FINISHED'
        ? { finishedAt: new Date(state.updatedAt) }
        : {}),
    },
  });
}
async function settle(
  tx: Tx,
  row: FishingSession,
  state: EngineState,
  now: number,
): Promise<CatchDto | undefined> {
  const prior = await tx.fishingCatch.findUnique({
    where: { sessionId: row.id },
  });
  if (prior) return prior.rewardSnapshot as unknown as CatchDto;
  if (!state.result || state.outcome !== 'CAUGHT') return undefined;
  const fish = state.selectedFish;
  assert(fish && fish.id === state.result.fishId, 500, 'INVALID_SERVER_RESULT');
  const before = await getPlayer(tx, row.userId);
  const caughtAt = state.simulatedAt ?? now;
  const snapshot = row.configSnapshot as unknown as {
    fishExchangeRateBps?: number;
    fishExchangeMaxGold?: string;
    config?: GameConfig;
  };
  // Missing policy means a session started before manual exchange existed.
  const manualExchange = snapshot.fishExchangeRateBps !== undefined;
  const quotedGold = manualExchange
    ? (BigInt(state.result.gold) * BigInt(snapshot.fishExchangeRateBps!)) /
      10000n
    : BigInt(state.result.gold);
  const maximumGold = BigInt(
    snapshot.fishExchangeMaxGold ?? FISH_EXCHANGE_DAILY_CAP.toString(),
  );
  const rewardGold =
    quotedGold < 1n
      ? 1n
      : manualExchange && quotedGold > maximumGold
        ? maximumGold
        : quotedGold;
  const collection = await tx.fishCollection.findUnique({
    where: { userId_fishId: { userId: row.userId, fishId: fish.id } },
  });
  const catchRow = await tx.fishingCatch.create({
    data: {
      sessionId: row.id,
      userId: row.userId,
      locationId: row.locationId,
      fishId: fish.id,
      weightG: state.result.weightG,
      rarity: fish.rarity,
      rewardGold,
      goldClaimed: !manualExchange,
      rewardXp: state.result.xp,
      rewardSnapshot: {},
      createdAt: new Date(caughtAt),
    },
  });
  if (!manualExchange)
    await ledger(tx, row.userId, rewardGold, 'CATCH', catchRow.id, now);
  await tx.userProfile.update({
    where: { userId: row.userId },
    data: {
      totalXp: { increment: state.result.xp },
      totalFish: { increment: 1 },
      largestFishG: Math.max(before.largestFishG, state.result.weightG),
    },
  });
  await tx.fishCollection.upsert({
    where: { userId_fishId: { userId: row.userId, fishId: fish.id } },
    update: {
      count: { increment: 1 },
      bestWeightG: Math.max(collection?.bestWeightG ?? 0, state.result.weightG),
      lastCaughtAt: new Date(caughtAt),
    },
    create: {
      userId: row.userId,
      fishId: fish.id,
      count: 1,
      bestWeightG: state.result.weightG,
      firstCaughtAt: new Date(caughtAt),
      lastCaughtAt: new Date(caughtAt),
    },
  });
  const result: CatchDto = {
    id: catchRow.id,
    fish: toPublicFish(fish),
    weightG: state.result.weightG,
    ...(state.result.lengthCm ? { lengthCm: state.result.lengthCm } : {}),
    caughtAt: new Date(caughtAt).toISOString(),
    locationId: row.locationId,
    baitSlug: state.baitSlug,
    baitName: snapshot.config?.baits.find((b) => b.slug === state.baitSlug)
      ?.name,
    rodName: snapshot.config?.equipment.find(
      (r) => r.slug === state.simulation?.rodSlug,
    )?.name,
    locationName: snapshot.config?.locations.find(
      (l) => l.id === row.locationId,
    )?.name,
    ...(state.simulation ? { rodSlug: state.simulation.rodSlug } : {}),
    gold: rewardGold.toString(),
    ...(manualExchange ? { goldDelivery: 'EXCHANGE' as const } : {}),
    xp: state.result.xp,
    newLevel: levelForXp(before.totalXp + state.result.xp),
    isNewSpecies: !collection,
    isRecord: state.result.weightG > (collection?.bestWeightG ?? 0),
  };
  await tx.fishingCatch.update({
    where: { id: catchRow.id },
    data: { rewardSnapshot: json(result) },
  });
  await updateCatchProgress(tx, row.userId, caughtAt);
  await event(
    tx,
    row.userId,
    'fish_caught',
    {
      catchId: catchRow.id,
      fishId: fish.id,
      rarity: fish.rarity,
      weightG: state.result.weightG,
    },
    now,
  );
  if (before.totalFish === 0)
    await event(tx, row.userId, 'first_catch', { catchId: catchRow.id }, now);
  return result;
}
async function project(
  tx: Tx,
  row: FishingSession,
  state: EngineState,
  now: number,
): Promise<SessionDto> {
  const caught = await settle(tx, row, state, now);
  await save(tx, row, state);
  return {
    id: row.id,
    ...toPublicEngine(state, now),
    ...(caught ? { catch: caught } : {}),
  };
}
export function registerFishing(ctx: Context) {
  registerFishingCommunity(ctx);
  const { app, db, now } = ctx;
  app.get(
    '/api/v1/fishing/sessions/active',
    continuation,
    async (request, reply) => {
      const userId = principal(request).id;
      const data = await db.$transaction(async (tx) => {
        await lockPlayer(tx, userId);
        const row = await tx.fishingSession.findFirst({
          where: {
            userId,
            state: { not: 'FINISHED' },
            ...(principal(request).fishingSessionId
              ? { id: principal(request).fishingSessionId }
              : {}),
          },
          orderBy: { createdAt: 'desc' },
        });
        if (!row) return null;
        return project(tx, row, advanceEngine(stateOf(row), now()), now());
      });
      if (data && !principal(request).fishingSessionId)
        await grantFishingAccess(ctx, reply, principal(request), data.id);
      return { data };
    },
  );
  app.post('/api/v1/fishing/sessions', auth, async (request, reply) => {
    const input = createSessionSchema.parse(request.body);
    const data = await mutation(
      ctx,
      request,
      '/fishing/sessions',
      async (tx, userId) => {
        const old = await tx.fishingSession.findFirst({
          where: { userId, state: { not: 'FINISHED' } },
        });
        if (old) {
          let state = advanceEngine(stateOf(old), now());
          if (state.state === 'CAUGHT' || state.state === 'ESCAPED') {
            await settle(tx, old, state, now());
            state = finishEngine(state, now());
            await save(tx, old, state);
          } else
            throw new ApiError(
              409,
              'ACTIVE_SESSION',
              'Bạn đang có lượt câu. Hãy quay lại hồ để tiếp tục.',
            );
        }
        const config = await runtimeConfig(tx);
        const player = await getPlayer(tx, userId);
        const location = config.value.locations.find(
          (l) => l.id === input.locationId,
        );
        assert(location, 404, 'LOCATION_NOT_FOUND');
        assert(
          await tx.fishingLocation.findFirst({
            where: { id: location.id, active: true },
          }),
          404,
          'LOCATION_NOT_FOUND',
        );
        assert(player.level >= location.minLevel, 422, 'LOCATION_LOCKED');
        const inventory = await getInventory(tx, userId);
        const rod = inventory.items.find((i) => i.kind === 'ROD' && i.equipped);
        assert(
          inventory.equipped.LINE && inventory.equipped.HOOK,
          422,
          'EQUIPMENT_INCOMPLETE',
          'Hãy trang bị dây và lưỡi câu trước khi vào hồ.',
        );
        const bait = inventory.items.find(
          (i) =>
            i.id === input.baitInventoryId &&
            i.kind === 'BAIT' &&
            i.quantity > 0,
        );
        assert(rod, 422, 'ROD_REQUIRED');
        assert(bait, 422, 'NO_BAIT', 'Bạn cần mua thêm mồi trong cửa hàng.');
        const rodInventory = await tx.userInventory.findUniqueOrThrow({
          where: { id: rod.id },
        });
        assert(
          await tx.equipment.findFirst({
            where: { id: rodInventory.equipmentId!, active: true },
          }),
          422,
          'EQUIPMENT_DISABLED',
        );
        const baitInventory = await tx.userInventory.findUniqueOrThrow({
          where: { id: bait.id },
        });
        assert(
          await tx.baitType.findFirst({
            where: { id: baitInventory.baitTypeId!, active: true },
          }),
          422,
          'BAIT_DISABLED',
        );
        assert(player.level >= bait.minLevel, 422, 'LEVEL_REQUIRED');
        const activeFish = new Set(
          (
            await tx.fishSpecies.findMany({
              where: { active: true },
              select: { id: true },
            })
          ).map((f) => f.id),
        );
        const loadout = inventory.items.filter((i) => i.slot && i.equipped);
        const line = loadout.find((i) => i.kind === 'LINE')!;
        const hook = loadout.find((i) => i.kind === 'HOOK')!;
        for (const item of [line, hook]) {
          assert(
            await tx.equipment.findFirst({
              where: { slug: item.slug, active: true },
            }),
            422,
            'EQUIPMENT_DISABLED',
          );
          assert(player.level >= item.minLevel, 422, 'LEVEL_REQUIRED');
        }
        const state = createEngine({
          now: now(),
          locationId: location.id,
          fishPool: config.value.fish.filter(
            (f) => location.fishIds.includes(f.id) && activeFish.has(f.id),
          ),
          baitSlug: bait.slug,
          // Terrain lines/hooks add their stats to the rod for the whole loadout.
          rodPower: loadout.reduce((sum, item) => sum + item.power, 0),
          rodControl: loadout.reduce((sum, item) => sum + item.control, 0),
          playerLevel: player.level,
          configVersion: config.version,
          tutorial: player.totalFish < 3,
          simulation: {
            conditions: conditionsFor(
              location.environment,
              now(),
              location.water,
              requestUtcOffset(request, now()),
            ),
            tackle: tackleFor(rod, line.slug, hook.slug),
            rodSlug: rod.slug,
            lineSlug: line.slug,
            hookSlug: hook.slug,
            baitMassG: baitMassG[bait.slug] ?? 15,
          },
        });
        const row = await tx.fishingSession.create({
          data: {
            userId,
            locationId: location.id,
            configId: config.id,
            configSnapshot: json({
              config: config.value,
              baitInventoryId: bait.id,
              fishExchangeRateBps: FISH_EXCHANGE_RATE_BPS,
              fishExchangeMaxGold: FISH_EXCHANGE_DAILY_CAP.toString(),
            }),
            simulation: json(state),
            expiresAt: new Date(now() + 300_000),
          },
        });
        await ledger(
          tx,
          userId,
          -BigInt(location.entryFeeGold),
          'ENTRY_FEE',
          row.id,
          now(),
        );
        await event(
          tx,
          userId,
          'session_started',
          { sessionId: row.id },
          now(),
        );
        return { id: row.id, ...toPublicEngine(state, now()) };
      },
    );
    reply.code(201);
    return { data };
  });
  app.get('/api/v1/fishing/sessions/:id', continuation, async (request) => {
    const id = z.uuid().parse((request.params as { id: string }).id);
    const userId = principal(request).id;
    const data = await db.$transaction(async (tx) => {
      await lockPlayer(tx, userId);
      const row = await tx.fishingSession.findFirst({ where: { id, userId } });
      assert(row, 404, 'NOT_FOUND');
      return project(tx, row, advanceEngine(stateOf(row), now()), now());
    });
    return { data };
  });
  for (const action of [
    'cast',
    'hook',
    'reel',
    'complete',
    'abandon',
  ] as const) {
    app.post(
      `/api/v1/fishing/sessions/:id/${action}`,
      action === 'cast' ? auth : continuation,
      async (request, reply) => {
        const id = z.uuid().parse((request.params as { id: string }).id);
        const input = (
          action === 'cast'
            ? castSchema
            : action === 'reel'
              ? reelSchema
              : action === 'hook'
                ? hookSchema
                : completeSchema
        ).parse(request.body);
        const data = await mutation(
          ctx,
          request,
          `/fishing/sessions/${id}/${action}`,
          async (tx, userId, key) => {
            const row = await tx.fishingSession.findFirst({
              where: { id, userId },
            });
            assert(row, 404, 'NOT_FOUND');
            assert(
              row.version === input.expectedVersion,
              409,
              'VERSION_CONFLICT',
            );
            let state = advanceEngine(stateOf(row), now());
            try {
              if (action === 'complete') {
                await settle(tx, row, state, now());
                state = finishEngine(state, now());
                if (row.state !== 'FINISHED')
                  await event(
                    tx,
                    userId,
                    'session_ended',
                    { sessionId: id, outcome: state.outcome },
                    now(),
                  );
              } else if (action === 'abandon') {
                state = abandonEngine(state, now());
                await settle(tx, row, state, now());
                state = finishEngine(state, now());
                if (row.state !== 'FINISHED')
                  await event(
                    tx,
                    userId,
                    'session_ended',
                    { sessionId: id, outcome: state.outcome },
                    now(),
                  );
              } else if (!state.outcome && state.state !== 'FINISHED') {
                if (action === 'cast') {
                  const cast = castSchema.parse(input);
                  state = castEngine(
                    state,
                    {
                      now: now(),
                      aim: cast.aim,
                      power: cast.power,
                      depth: cast.depth,
                    },
                    csprng,
                  );
                  const snapshot = row.configSnapshot as unknown as {
                    baitInventoryId: string;
                  };
                  const bait = await tx.userInventory.findFirst({
                    where: {
                      id: snapshot.baitInventoryId,
                      userId,
                      quantity: { gt: 0 },
                    },
                  });
                  assert(bait, 422, 'NO_BAIT');
                  await tx.userInventory.update({
                    where: { id: bait.id },
                    data: { quantity: { decrement: 1 } },
                  });
                  if (
                    (await tx.fishingSession.count({
                      where: { userId, castAt: { not: null } },
                    })) === 0
                  )
                    await event(
                      tx,
                      userId,
                      'first_cast',
                      { sessionId: id },
                      now(),
                    );
                } else if (action === 'hook') state = hookEngine(state, now());
                else {
                  const reel = reelSchema.parse(input);
                  state = reelEngine(state, reel.action, now(), {
                    drag: reel.drag,
                    rodAngle: reel.rodAngle,
                  });
                }
              }
            } catch (error) {
              if (error instanceof EngineError)
                throw new ApiError(
                  error.code === 'ACTION_TOO_FAST' ? 429 : 409,
                  error.code,
                  error.message,
                );
              throw error;
            }
            const result = await project(tx, row, state, now());
            await tx.fishingAction.create({
              data: {
                sessionId: id,
                idempotencyKey: key,
                requestHash: createHash('sha256')
                  .update(JSON.stringify(input))
                  .digest('hex'),
                action,
                expectedVersion: input.expectedVersion,
                payload: json(input),
                response: json(result),
              },
            });
            return result;
          },
        );
        if (action === 'cast')
          await grantFishingAccess(ctx, reply, principal(request), id);
        return { data };
      },
    );
  }
}
