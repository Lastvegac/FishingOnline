import { z } from 'zod';
import { lakeMessageInputSchema } from '@fwo/contracts';
import { conditionsFor } from '@fwo/game-config';
import { requestUtcOffset } from '../../lib/time-zone.js';
import type { CatchDto, LakeCommunityDto } from '@fwo/contracts';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import type { Tx } from '../../db.js';
import { json } from '../../db.js';
import { assert } from '../../lib/errors.js';
import { mutation } from '../../lib/transaction.js';
import { getPlayer, runtimeConfig } from '../players/service.js';

export function fishingWeek(now: number) {
  const offset = 7 * 3600000,
    day = 86400000;
  const local = new Date(now + offset);
  const start =
    Math.floor((now + offset) / day) * day -
    ((local.getUTCDay() + 6) % 7) * day -
    offset;
  return { start, end: start + 7 * day };
}
const auth = { config: { auth: true }, schema: { tags: ['Fishing'] } };
async function access(db: Tx, userId: string, locationId: string) {
  const location = await db.fishingLocation.findUnique({
    where: { id: locationId },
  });
  assert(location?.active, 404, 'LOCATION_NOT_FOUND');
  assert(
    (await getPlayer(db, userId)).level >= location.minLevel,
    422,
    'LOCATION_LOCKED',
  );
}
/** Low-rate room snapshots. Fish forces and hidden selection data never enter the room. */
export function registerFishingCommunity(ctx: Context) {
  const { app, db, now } = ctx;
  app.get(
    '/api/v1/fishing/locations/:id/conditions',
    { ...auth, config: { auth: true, fishingAccess: 'context' } },
    async (request) => {
      const id = z.uuid().parse((request.params as { id: string }).id);
      await access(db, principal(request).id, id);
      const config = await runtimeConfig(db);
      const location = config.value.locations.find((l) => l.id === id);
      assert(location, 404, 'LOCATION_NOT_FOUND');
      return {
        data: conditionsFor(
          location.environment,
          now(),
          location.water,
          requestUtcOffset(request, now()),
        ),
      };
    },
  );
  app.get('/api/v1/fishing/locations/:id/community', auth, async (request) => {
    const id = z.uuid().parse((request.params as { id: string }).id);
    await access(db, principal(request).id, id);
    const time = now(),
      week = fishingWeek(time);
    const [sessions, messages, scores] = await Promise.all([
      db.fishingSession.findMany({
        where: {
          locationId: id,
          state: { not: 'FINISHED' },
          updatedAt: { gt: new Date(time - 15000) },
          expiresAt: { gt: new Date(time) },
          user: { status: 'ACTIVE', deletedAt: null },
        },
        include: { user: { include: { profile: true } } },
        orderBy: { userId: 'asc' },
        take: 12,
      }),
      db.lakeMessage.findMany({
        where: { locationId: id, user: { status: 'ACTIVE', deletedAt: null } },
        include: { user: { include: { profile: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
      }),
      db.fishingCatch.groupBy({
        by: ['userId'],
        where: {
          locationId: id,
          createdAt: { gte: new Date(week.start), lt: new Date(week.end) },
          user: { status: 'ACTIVE', deletedAt: null },
        },
        _max: { weightG: true },
        _count: { id: true },
        orderBy: [{ _max: { weightG: 'desc' } }, { userId: 'asc' }],
        take: 10,
      }),
    ]);
    const profiles = await db.userProfile.findMany({
      where: { userId: { in: scores.map((s) => s.userId) } },
      select: { userId: true, username: true },
    });
    const data: LakeCommunityDto = {
      serverTime: new Date(time).toISOString(),
      anglers: sessions.map((s) => ({
        userId: s.userId,
        username: s.user.profile!.username,
        state: s.state,
      })),
      messages: messages.reverse().map((m) => ({
        id: m.id,
        userId: m.userId,
        username: m.user.profile!.username,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        ...(m.catchSnapshot
          ? { catch: m.catchSnapshot as unknown as CatchDto }
          : {}),
      })),
      week: {
        startsAt: new Date(week.start).toISOString(),
        endsAt: new Date(week.end).toISOString(),
        entries: scores.map((s, i) => ({
          userId: s.userId,
          username: profiles.find((p) => p.userId === s.userId)!.username,
          rank: i + 1,
          weightG: s._max.weightG!,
          count: s._count.id,
        })),
      },
    };
    return { data };
  });
  app.post('/api/v1/fishing/locations/:id/messages', auth, async (request) => {
    const id = z.uuid().parse((request.params as { id: string }).id);
    const input = lakeMessageInputSchema.parse(request.body);
    const data = await mutation(
      ctx,
      request,
      `/fishing/locations/${id}/messages`,
      async (tx, userId) => {
        await access(tx, userId, id);
        const latest = await tx.lakeMessage.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        assert(
          !latest || now() - latest.createdAt.getTime() >= 3000,
          429,
          'CHAT_TOO_FAST',
          'Vui lòng chờ 3 giây trước khi gửi tin tiếp theo.',
        );
        let caught: CatchDto | undefined;
        if (input.catchId) {
          const row = await tx.fishingCatch.findFirst({
            where: { id: input.catchId, userId, locationId: id },
          });
          assert(row, 404, 'CATCH_NOT_FOUND');
          caught = row.rewardSnapshot as unknown as CatchDto;
        }
        const message = await tx.lakeMessage.create({
          data: {
            userId,
            locationId: id,
            text: input.text,
            ...(caught ? { catchSnapshot: json(caught) } : {}),
            createdAt: new Date(now()),
          },
        });
        return {
          id: message.id,
          userId,
          username: (await getPlayer(tx, userId)).username,
          text: message.text,
          createdAt: message.createdAt.toISOString(),
          ...(caught ? { catch: caught } : {}),
        };
      },
    );
    return { data };
  });
}
