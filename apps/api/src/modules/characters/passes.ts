import { z } from 'zod';
import { fashionPassInputSchema } from '@fwo/contracts';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import { json } from '../../db.js';
import { assert } from '../../lib/errors.js';
import { mutation } from '../../lib/transaction.js';
import { auditCharacter, diamondLedger } from './service.js';
const auth = { config: { auth: true }, schema: { tags: ['Fashion passes'] } };
export function registerFashionPasses(ctx: Context) {
  const { app, db, now } = ctx;
  app.get('/api/v1/fashion/passes', auth, async (req) => {
    const userId = principal(req).id,
      profile = await db.userProfile.findUniqueOrThrow({ where: { userId } });
    const passes = await db.fashionPass.findMany({
      where: { active: true, endsAt: { gt: new Date(now() - 7 * 86400000) } },
      orderBy: { startsAt: 'desc' },
      take: 20,
    });
    const items = await Promise.all(
      passes.map(async (row) => {
        const grants = await db.userGrant.findMany({
            where: { userId, periodKey: row.id },
          }),
          enroll = grants.find((g) => g.key === 'FASHION_PASS_ENROLL'),
          purchase = grants.find((g) => g.key === 'FASHION_PASS_PURCHASE');
        const { version, ...base } = row;
        const data = fashionPassInputSchema.parse({
          ...base,
          priceDiamonds: row.priceDiamonds.toString(),
          startsAt: row.startsAt.toISOString(),
          endsAt: row.endsAt.toISOString(),
          expectedVersion: version,
        });
        return {
          ...data,
          version: row.version,
          enrolled: !!enroll,
          purchased: !!purchase,
          progress: enroll
            ? Math.max(
                0,
                profile.totalFish -
                  (enroll.payload as { baselineFish: number }).baselineFish,
              )
            : 0,
          tiers: data.tiers.map((t) => ({
            ...t,
            claimed: grants.some(
              (g) => g.key === `FASHION_PASS_REWARD:${t.id}`,
            ),
          })),
        };
      }),
    );
    return { data: { items } };
  });
  for (const action of ['enroll', 'purchase', 'claim'] as const)
    app.post(`/api/v1/fashion/passes/:id/${action}`, auth, async (req) => {
      const id = z.uuid().parse((req.params as { id: string }).id),
        input = z
          .strictObject({
            tierId: z.string().max(64).optional(),
            expectedPrice: z
              .string()
              .regex(/^\d{1,18}$/)
              .optional(),
            expectedVersion: z.number().int().positive(),
          })
          .parse(req.body);
      return {
        data: await mutation(
          ctx,
          req,
          `/fashion/passes/${id}/${action}`,
          async (tx, userId) => {
            await tx.$queryRaw`SELECT id FROM fashion_passes WHERE id=${id}::uuid FOR UPDATE`;
            const row = await tx.fashionPass.findUnique({ where: { id } });
            assert(
              row?.active && row.version === input.expectedVersion,
              409,
              'VERSION_CONFLICT',
            );
            assert(
              row.startsAt.getTime() <= now() &&
                now() <
                  row.endsAt.getTime() +
                    (action === 'claim' ? 7 * 86400000 : 0),
              422,
              'EVENT_CLOSED',
            );
            const profile = await tx.userProfile.findUniqueOrThrow({
              where: { userId },
            });
            const where = {
              userId_key_periodKey: {
                userId,
                key: 'FASHION_PASS_ENROLL',
                periodKey: id,
              },
            };
            const enroll = await tx.userGrant.findUnique({ where });
            if (action === 'enroll' || action === 'purchase') {
              if (!enroll)
                await tx.userGrant.create({
                  data: {
                    userId,
                    key: 'FASHION_PASS_ENROLL',
                    periodKey: id,
                    payload: {
                      baselineFish: profile.totalFish,
                      version: row.version,
                    },
                  },
                });
              if (action === 'purchase') {
                assert(
                  row.priceDiamonds.toString() === input.expectedPrice,
                  409,
                  'PRICE_CHANGED',
                );
                assert(
                  !(await tx.userGrant.findUnique({
                    where: {
                      userId_key_periodKey: {
                        userId,
                        key: 'FASHION_PASS_PURCHASE',
                        periodKey: id,
                      },
                    },
                  })),
                  409,
                  'ALREADY_OWNED',
                );
                await diamondLedger(
                  tx,
                  userId,
                  -row.priceDiamonds,
                  'FASHION_PASS',
                  `PASS:${id}:${userId}`,
                  now(),
                );
                await tx.userGrant.create({
                  data: {
                    userId,
                    key: 'FASHION_PASS_PURCHASE',
                    periodKey: id,
                    payload: {
                      price: row.priceDiamonds.toString(),
                      version: row.version,
                    },
                  },
                });
              }
            } else {
              assert(enroll, 422, 'PASS_NOT_ENROLLED');
              const tiers = z
                  .array(
                    z.strictObject({
                      id: z.string(),
                      targetFish: z.number(),
                      premium: z.boolean(),
                      cosmeticId: z.string(),
                    }),
                  )
                  .parse(row.tiers),
                tier = tiers.find((t) => t.id === input.tierId);
              assert(
                tier &&
                  profile.totalFish -
                    (enroll.payload as { baselineFish: number }).baselineFish >=
                    tier.targetFish,
                422,
                'REWARD_UNAVAILABLE',
              );
              if (tier.premium)
                assert(
                  await tx.userGrant.findUnique({
                    where: {
                      userId_key_periodKey: {
                        userId,
                        key: 'FASHION_PASS_PURCHASE',
                        periodKey: id,
                      },
                    },
                  }),
                  403,
                  'PREMIUM_REQUIRED',
                );
              assert(
                !(await tx.userGrant.findUnique({
                  where: {
                    userId_key_periodKey: {
                      userId,
                      key: `FASHION_PASS_REWARD:${tier.id}`,
                      periodKey: id,
                    },
                  },
                })),
                409,
                'ALREADY_CLAIMED',
              );
              await tx.userInventory.upsert({
                where: {
                  userId_cosmeticId: { userId, cosmeticId: tier.cosmeticId },
                },
                create: { userId, cosmeticId: tier.cosmeticId, quantity: 1 },
                update: {},
              });
              await tx.userGrant.create({
                data: {
                  userId,
                  key: `FASHION_PASS_REWARD:${tier.id}`,
                  periodKey: id,
                  payload: { cosmeticId: tier.cosmeticId },
                },
              });
            }
            return { ok: true };
          },
        ),
      };
    });
  app.post(
    '/api/v1/admin/fashion/passes',
    {
      config: { auth: true, roles: ['SUPER_ADMIN', 'GAME_ADMIN'] },
      schema: { tags: ['Fashion admin'] },
    },
    async (req) => {
      const input = fashionPassInputSchema
        .safeExtend({ reason: z.string().min(5).max(1000) })
        .parse(req.body);
      return {
        data: await mutation(
          ctx,
          req,
          '/admin/fashion/passes',
          async (tx, userId) => {
            if (input.id)
              await tx.$queryRaw`SELECT id FROM fashion_passes WHERE id=${input.id}::uuid FOR UPDATE`;
            const before = input.id
              ? await tx.fashionPass.findUnique({ where: { id: input.id } })
              : null;
            assert(
              (before?.version ?? 0) === input.expectedVersion,
              409,
              'VERSION_CONFLICT',
            );
            assert(
              !before || before.startsAt.getTime() > now(),
              409,
              'EVENT_ALREADY_STARTED',
            );
            const ids = [...new Set(input.tiers.map((t) => t.cosmeticId))];
            assert(
              (await tx.characterCosmetic.count({
                where: { id: { in: ids }, active: true },
              })) === ids.length,
              422,
              'INVALID_COSMETIC',
            );
            const {
                id: _id,
                reason,
                expectedVersion: _expectedVersion,
                ...rest
              } = input,
              data = {
                ...rest,
                startsAt: new Date(rest.startsAt),
                endsAt: new Date(rest.endsAt),
                priceDiamonds: BigInt(rest.priceDiamonds),
                tiers: json(rest.tiers),
              };
            const row = before
              ? await tx.fashionPass.update({
                  where: { id: before.id },
                  data: { ...data, version: { increment: 1 } },
                })
              : await tx.fashionPass.create({ data });
            await auditCharacter(
              tx,
              userId,
              'FASHION_PASS',
              row.id,
              before,
              { ...row, reason },
              now(),
            );
            return { id: row.id };
          },
        ),
      };
    },
  );
}
