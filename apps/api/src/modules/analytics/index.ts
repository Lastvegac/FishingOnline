import { z } from 'zod';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import { json } from '../../db.js';

const clientEvent = z.strictObject({
  eventId: z.uuid(),
  name: z.enum([
    'tutorial_started',
    'tutorial_completed',
    'daily_login',
    'page_view',
    'session_started',
    'session_ended',
  ]),
  occurredAt: z.iso.datetime(),
  properties: z
    .record(
      z.string(),
      z.union([z.string().max(100), z.number().finite(), z.boolean()]),
    )
    .refine((p) => Object.keys(p).length <= 10)
    .default({}),
});
export function registerAnalytics(ctx: Context) {
  const { app, db, now } = ctx;
  app.post(
    '/api/v1/analytics/events',
    { config: { auth: true }, schema: { tags: ['Analytics'] } },
    async (request, reply) => {
      const input = z
        .strictObject({ events: z.array(clientEvent).max(20).min(1) })
        .parse(request.body);
      const result = await db.analyticsEvent.createMany({
        skipDuplicates: true,
        data: input.events.map((e) => ({
          eventId: e.eventId,
          userId: principal(request).id,
          eventName: e.name,
          source: 'CLIENT',
          properties: json(e.properties),
          occurredAt: new Date(now()),
        })),
      });
      reply.code(202);
      return { data: { accepted: result.count } };
    },
  );
  app.get(
    '/api/v1/admin/analytics',
    {
      config: { auth: true, roles: ['SUPER_ADMIN', 'GAME_ADMIN', 'ANALYST'] },
      schema: { tags: ['Analytics'], security: [{ bearerAuth: [] }] },
    },
    async () => {
      const end = new Date(now());
      async function active(days: number) {
        const rows = await db.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT count(DISTINCT user_id)::bigint AS count FROM analytics_events WHERE source = 'SERVER' AND user_id IS NOT NULL AND occurred_at >= ${new Date(now() - days * 86400_000)} AND occurred_at <= ${end}`;
        return Number(rows[0]?.count ?? 0);
      }
      async function retention(day: number) {
        const rows = await db.$queryRaw<
          Array<{ cohort: bigint; retained: bigint }>
        >`
        SELECT count(*)::bigint AS cohort,
          count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM analytics_events e WHERE e.user_id = u.id AND e.source = 'SERVER'
            AND e.occurred_at >= ((date_trunc('day', u.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') + ${day} * interval '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh')
            AND e.occurred_at < ((date_trunc('day', u.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') + ${day + 1} * interval '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh')
          ))::bigint AS retained
        FROM users u WHERE u.created_at >= ${new Date(now() - (day + 30) * 86400_000)}
        AND u.created_at < ${new Date(now() - (day + 1) * 86400_000)} AND u.deleted_at IS NULL`;
        const cohort = Number(rows[0]?.cohort ?? 0),
          retained = Number(rows[0]?.retained ?? 0);
        return { cohort, retained, rate: cohort ? retained / cohort : null };
      }
      const [
        dau,
        wau,
        mau,
        d1,
        d7,
        d30,
        signups,
        firstCatchUsers,
        tutorialStarted,
        tutorialCompleted,
        durations,
      ] = await Promise.all([
        active(1),
        active(7),
        active(30),
        retention(1),
        retention(7),
        retention(30),
        db.user.count(),
        db.userProfile.count({ where: { totalFish: { gt: 0 } } }),
        db.analyticsEvent.groupBy({
          by: ['userId'],
          where: { eventName: 'tutorial_started' },
        }),
        db.analyticsEvent.groupBy({
          by: ['userId'],
          where: { eventName: 'tutorial_completed' },
        }),
        db.$queryRaw<
          Array<{ seconds: number | null }>
        >`SELECT AVG(EXTRACT(epoch FROM (finished_at-created_at)))::float8 AS seconds FROM fishing_sessions WHERE finished_at IS NOT NULL AND created_at >= ${new Date(now() - 30 * 86400_000)}`,
      ]);
      return {
        data: {
          dau,
          wau,
          mau,
          d1,
          d7,
          d30,
          signups,
          firstCatchUsers,
          firstCatchConversion: signups ? firstCatchUsers / signups : null,
          tutorialStarted: tutorialStarted.length,
          tutorialCompleted: tutorialCompleted.length,
          tutorialCompletionRate: tutorialStarted.length
            ? tutorialCompleted.length / tutorialStarted.length
            : null,
          averageFishingSessionSeconds: durations[0]?.seconds ?? null,
          revenue: null,
          arpu: null,
          arppu: null,
          payingConversion: null,
          note: 'Rolling active-user windows; retention uses matured Vietnam-day cohorts. Payments are disabled. Client tutorial events are informational.',
        },
      };
    },
  );
}
