import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import type { AdminWalletTransactionDto } from '@fwo/contracts';
import {
  fishImageKeySchema,
  fishPhotoUploadSchema,
  passwordSchema,
} from '@fwo/contracts';
import { z } from 'zod';
import { fishConfigSchema, gameConfigSchema } from '@fwo/game-config';
import type { GameConfig } from '@fwo/game-config';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import type { Tx } from '../../db.js';
import { json } from '../../db.js';
import { assert } from '../../lib/errors.js';
import { mutation } from '../../lib/transaction.js';
import { runtimeConfig } from '../players/service.js';
import {
  activateConfiguration,
  assertPlayableConfiguration,
} from './config.js';
import { prepareFishPhoto, saveFishPhoto } from './fish-photos.js';

const editors = ['SUPER_ADMIN', 'GAME_ADMIN'];
const readers = ['SUPER_ADMIN', 'GAME_ADMIN', 'SUPPORT', 'ANALYST'];
const auth = (roles = editors) => ({
  config: { auth: true, roles },
  schema: { tags: ['Admin'], security: [{ bearerAuth: [] }] },
});
const changeFields = {
  reason: z.string().trim().min(5).max(1000).optional(),
  expectedVersion: z.number().int().positive().optional(),
  active: z.boolean().optional(),
};
export const patchSchemas = {
  fish: z.strictObject({
    ...changeFields,
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    imageKey: fishImageKeySchema.optional(),
    photoUpload: fishPhotoUploadSchema.optional(),
    rarity: z
      .enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'])
      .optional(),
    minWeightG: z.number().int().positive().max(1000000).optional(),
    maxWeightG: z.number().int().positive().max(1000000).optional(),
    baseWeightG: z.number().int().positive().max(1000000).optional(),
    spawnWeight: z.number().min(0).max(10000).optional(),
    baseRewardGold: z.coerce.number().int().min(1).max(10000).optional(),
    baseXp: z.number().int().min(1).max(10000).optional(),
    difficulty: z.number().int().min(1).max(100).optional(),
  }),
  equipment: z.strictObject({
    ...changeFields,
    name: z.string().min(1).max(100).optional(),
    power: z.number().min(0).max(50).optional(),
    control: z.number().min(0).max(50).optional(),
    minLevel: z.number().int().min(1).max(1000).optional(),
  }),
  baits: z.strictObject({
    ...changeFields,
    name: z.string().min(1).max(100).optional(),
    minLevel: z.number().int().min(1).max(1000).optional(),
  }),
  locations: z.strictObject({
    ...changeFields,
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    entryFeeGold: z
      .string()
      .regex(/^\d{1,9}$/)
      .optional(),
    minLevel: z.number().int().min(1).max(1000).optional(),
    fishIds: z.array(z.uuid()).min(1).optional(),
  }),
  missions: z.strictObject({
    ...changeFields,
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    target: z.number().int().positive().max(10000000).optional(),
    rewardGold: z
      .string()
      .regex(/^\d{1,9}$/)
      .optional(),
    rewardXp: z.number().int().min(0).max(10000).optional(),
  }),
  'shop-items': z.strictObject({
    ...changeFields,
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    priceGold: z
      .string()
      .regex(/^\d{1,9}$/)
      .optional(),
    grantQuantity: z.number().int().min(1).max(10000).optional(),
    minLevel: z.number().int().min(1).max(1000).optional(),
    stock: z.number().int().nonnegative().nullable().optional(),
    sellPriceGold: z
      .string()
      .regex(/^\d{1,9}$/)
      .optional(),
    locationIds: z.array(z.uuid()).max(100).optional(),
  }),
};
const configKeys = {
  fish: 'fish',
  equipment: 'equipment',
  baits: 'baits',
  locations: 'locations',
  missions: 'missions',
  'shop-items': 'shop',
} as const;

async function audit(
  tx: Tx,
  actorId: string,
  requestId: string,
  action: string,
  targetType: string,
  targetId: string,
  before: unknown,
  after: unknown,
  reason: string,
) {
  return tx.auditLog.create({
    data: {
      actorId,
      actorSnapshot: { userId: actorId },
      requestId,
      action,
      targetType,
      targetId,
      before: json(before),
      after: json(after),
      reason,
    },
  });
}
async function setActive(
  tx: Tx,
  resource: keyof typeof patchSchemas,
  id: string,
  active: boolean,
) {
  const where = { id };
  if (resource === 'fish')
    return tx.fishSpecies.update({ where, data: { active } });
  if (resource === 'equipment')
    return tx.equipment.update({ where, data: { active } });
  if (resource === 'baits')
    return tx.baitType.update({ where, data: { active } });
  if (resource === 'locations')
    return tx.fishingLocation.update({ where, data: { active } });
  if (resource === 'missions')
    return tx.mission.update({ where, data: { active } });
  return tx.shopItem.update({ where, data: { active } });
}
async function listResource(tx: Tx, resource: keyof typeof patchSchemas) {
  const config = await runtimeConfig(tx);
  const values = config.value[configKeys[resource]];
  const flags =
    resource === 'fish'
      ? await tx.fishSpecies.findMany()
      : resource === 'equipment'
        ? await tx.equipment.findMany()
        : resource === 'baits'
          ? await tx.baitType.findMany()
          : resource === 'locations'
            ? await tx.fishingLocation.findMany()
            : resource === 'missions'
              ? await tx.mission.findMany()
              : await tx.shopItem.findMany();
  return {
    items: values.map((value) => ({
      ...value,
      active: flags.find((f) => f.id === value.id)?.active ?? true,
      version: flags.find((f) => f.id === value.id)?.version ?? 1,
      ...(resource === 'shop-items'
        ? {
            stock:
              (
                flags.find((f) => f.id === value.id) as {
                  stock?: number | null;
                }
              )?.stock ?? null,
          }
        : {}),
    })),
    configVersion: config.version,
  };
}

export function registerAdmin(ctx: Context) {
  const { app, db, now } = ctx;
  app.get(
    '/api/v1/fish-photos/:id',
    {
      schema: {
        tags: ['Fish'],
        response: { 200: { type: 'string', format: 'binary' } },
      },
    },
    async (request, reply) => {
      const id = z.uuid().parse((request.params as { id: string }).id);
      const photo = await db.fishPhotoAsset.findUnique({
        where: { id },
        select: { content: true },
      });
      assert(photo, 404, 'NOT_FOUND');
      return reply.type('image/webp').send(Buffer.from(photo.content));
    },
  );
  app.get('/api/v1/admin/overview', auth(readers), async (request) => {
    const [players, catches, balance, activeSessions, events, recentAudit] =
      await Promise.all([
        db.user.count({ where: { deletedAt: null } }),
        db.fishingCatch.count(),
        db.wallet.aggregate({ _sum: { balanceGold: true } }),
        db.fishingSession.count({
          where: {
            state: { not: 'FINISHED' },
            expiresAt: { gt: new Date(now()) },
          },
        }),
        db.analyticsEvent.count(),
        db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      ]);
    return {
      data: {
        players,
        catches,
        totalGold: (balance._sum.balanceGold ?? 0n).toString(),
        activeSessions,
        events,
        recentAudit: ['SUPER_ADMIN', 'SUPPORT'].includes(
          principal(request).role,
        )
          ? recentAudit
          : [],
      },
    };
  });
  for (const resource of Object.keys(patchSchemas) as Array<
    keyof typeof patchSchemas
  >) {
    app.get(`/api/v1/admin/${resource}`, auth(), async () => ({
      data: await listResource(db, resource),
    }));
    app.get(`/api/v1/admin/${resource}/:id`, auth(), async (request) => {
      const id = z.uuid().parse((request.params as { id: string }).id);
      const item = (await listResource(db, resource)).items.find(
        (i) => i.id === id,
      );
      assert(item, 404, 'NOT_FOUND');
      return { data: item };
    });
    app.patch(
      `/api/v1/admin/${resource}/:id`,
      {
        ...auth(),
        ...(resource === 'fish' ? { bodyLimit: 8 * 1024 * 1024 } : {}),
      },
      async (request) => {
        const id = z.uuid().parse((request.params as { id: string }).id);
        const input = patchSchemas[resource].parse(request.body);
        const photo = await prepareFishPhoto(
          'photoUpload' in input ? input.photoUpload : undefined,
        );
        return {
          data: await mutation(
            ctx,
            request,
            `/admin/${resource}/${id}`,
            async (tx, userId) => {
              await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:game-config'))`;
              const old = await runtimeConfig(tx);
              const current = (await listResource(tx, resource)).items.find(
                (i) => i.id === id,
              );
              assert(current, 404, 'NOT_FOUND');
              if (input.expectedVersion !== undefined)
                assert(
                  input.expectedVersion === current.version,
                  409,
                  'VERSION_CONFLICT',
                );
              const {
                reason,
                expectedVersion: _version,
                active,
                ...patch
              } = input;
              delete (patch as Record<string, unknown>).photoUpload;
              if (photo)
                (patch as Record<string, unknown>).imageKey =
                  await saveFishPhoto(tx, photo);
              const key = configKeys[resource];
              const draft = structuredClone(old.value);
              draft.version =
                Math.max(
                  old.version,
                  (
                    await tx.systemConfig.aggregate({
                      where: { key: 'game' },
                      _max: { version: true },
                    })
                  )._max.version ?? 0,
                ) + 1;
              (draft[key] as Array<Record<string, unknown>>) = draft[key].map(
                (item) => (item.id === id ? { ...item, ...patch } : item),
              ) as unknown as Array<Record<string, unknown>>;
              // stock is normalized shop state, not a field of immutable GameConfig.
              if (resource === 'shop-items')
                for (const item of draft.shop)
                  delete (item as unknown as Record<string, unknown>).stock;
              const validated = gameConfigSchema.parse(draft);
              await activateConfiguration(tx, validated, now());
              if (active !== undefined) {
                if (!active && resource === 'equipment')
                  assert(
                    !['wood-rod', 'nylon-line', 'basic-hook'].includes(
                      String(current.slug),
                    ),
                    422,
                    'STARTER_EQUIPMENT_REQUIRED',
                  );
                if (!active && resource === 'baits')
                  assert(current.slug !== 'worm', 422, 'STARTER_BAIT_REQUIRED');
                if (!active && resource === 'locations')
                  assert(
                    old.value.locations.length > 1 ||
                      current.id !== old.value.locations[0]?.id,
                    422,
                    'STARTER_LOCATION_REQUIRED',
                  );
                await setActive(tx, resource, id, active);
                if (resource === 'fish' && !active) {
                  const activeIds = new Set(
                    (
                      await tx.fishSpecies.findMany({
                        where: { active: true },
                        select: { id: true },
                      })
                    ).map((f) => f.id),
                  );
                  assert(
                    validated.locations.every((l) =>
                      l.fishIds.some(
                        (f) =>
                          activeIds.has(f) &&
                          validated.fish.some(
                            (s) =>
                              s.id === f &&
                              s.difficulty <= 25 &&
                              s.spawnWeight > 0,
                          ),
                      ),
                    ),
                    422,
                    'TUTORIAL_POOL_REQUIRED',
                  );
                }
              }
              if (resource === 'shop-items' && 'stock' in input)
                await tx.shopItem.update({
                  where: { id },
                  data: {
                    stock: z
                      .number()
                      .int()
                      .nonnegative()
                      .nullable()
                      .parse(input.stock),
                  },
                });
              await assertPlayableConfiguration(tx, validated);
              const updated = (await listResource(tx, resource)).items.find(
                (i) => i.id === id,
              )!;
              const log = await audit(
                tx,
                userId,
                request.id,
                'UPDATE_CONFIG_ENTITY',
                resource,
                id,
                current,
                updated,
                reason ?? 'Admin content editor',
              );
              return {
                ...updated,
                auditId: log.id,
                configVersion: validated.version,
              };
            },
          ),
        };
      },
    );
    // Creation uses the full canonical config entry, preventing partial invalid content.
    app.post(
      `/api/v1/admin/${resource}`,
      {
        ...auth(),
        ...(resource === 'fish' ? { bodyLimit: 8 * 1024 * 1024 } : {}),
      },
      async (request, reply) => {
        const body = z
          .strictObject({
            item: z.record(z.string(), z.unknown()),
            reason: z.string().min(5).max(1000),
            ...(resource === 'fish'
              ? { photoUpload: fishPhotoUploadSchema.optional() }
              : {}),
          })
          .parse(request.body);
        const photo = await prepareFishPhoto(
          fishPhotoUploadSchema.optional().parse(body.photoUpload),
        );
        const data = await mutation(
          ctx,
          request,
          `/admin/${resource}`,
          async (tx, userId) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:game-config'))`;
            const current = await runtimeConfig(tx);
            const draft = structuredClone(current.value);
            const key = configKeys[resource];
            const id =
              typeof body.item.id === 'string' ? body.item.id : randomUUID();
            const item = {
              ...body.item,
              ...(photo ? { imageKey: await saveFishPhoto(tx, photo) } : {}),
            };
            // Validate a fish on its own so errors map to the editor's field names.
            if (resource === 'fish') fishConfigSchema.parse({ ...item, id });
            (draft[key] as unknown[]).push({ ...item, id });
            draft.version =
              ((
                await tx.systemConfig.aggregate({
                  where: { key: 'game' },
                  _max: { version: true },
                })
              )._max.version ?? 0) + 1;
            await activateConfiguration(
              tx,
              gameConfigSchema.parse(draft),
              now(),
            );
            await audit(
              tx,
              userId,
              request.id,
              'CREATE_CONFIG_ENTITY',
              resource,
              id,
              null,
              item,
              body.reason,
            );
            return (await listResource(tx, resource)).items.find(
              (i) => i.id === id,
            );
          },
        );
        reply.code(201);
        return { data };
      },
    );
    app.delete(`/api/v1/admin/${resource}/:id`, auth(), async (request) => {
      const id = z.uuid().parse((request.params as { id: string }).id);
      return {
        data: await mutation(
          ctx,
          request,
          `/admin/${resource}/${id}/archive`,
          async (tx, userId) => {
            assert(
              !['equipment', 'baits', 'locations', 'fish'].includes(resource),
              422,
              'ARCHIVE_VIA_EDITOR',
              'Dùng trình sửa với active=false để kiểm tra các ràng buộc cấu hình.',
            );
            const before = (await listResource(tx, resource)).items.find(
              (i) => i.id === id,
            );
            assert(before, 404, 'NOT_FOUND');
            await setActive(tx, resource, id, false);
            await assertPlayableConfiguration(
              tx,
              (await runtimeConfig(tx)).value,
            );
            await audit(
              tx,
              userId,
              request.id,
              'ARCHIVE_CONFIG_ENTITY',
              resource,
              id,
              before,
              { active: false },
              'Admin archive',
            );
            return { id, active: false };
          },
        ),
      };
    });
  }
  app.get(
    '/api/v1/admin/users',
    auth(['SUPER_ADMIN', 'SUPPORT', 'GAME_ADMIN']),
    async () => ({
      data: {
        items: await db.user.findMany({
          take: 100,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
            profile: {
              select: { username: true, totalXp: true, totalFish: true },
            },
            admin: { select: { role: true } },
          },
        }),
      },
    }),
  );
  app.patch(
    '/api/v1/admin/users/:id/status',
    auth(['SUPER_ADMIN']),
    async (request) => {
      const id = z.uuid().parse((request.params as { id: string }).id);
      const input = z
        .strictObject({
          status: z.enum(['ACTIVE', 'SUSPENDED']),
          reason: z.string().min(5).max(1000),
        })
        .parse(request.body);
      return {
        data: await mutation(
          ctx,
          request,
          `/admin/users/${id}/status`,
          async (tx, userId) => {
            assert(id !== userId, 422, 'CANNOT_SUSPEND_SELF');
            // Lock target in a deterministic order separately from the actor; role changes are globally serialized.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:admin-users'))`;
            const before = await tx.user.findUnique({
              where: { id },
              include: { admin: true },
            });
            assert(before, 404, 'NOT_FOUND');
            if (
              before.admin?.role === 'SUPER_ADMIN' &&
              input.status === 'SUSPENDED'
            )
              assert(
                (await tx.adminUser.count({
                  where: { role: 'SUPER_ADMIN', user: { status: 'ACTIVE' } },
                })) > 1,
                409,
                'LAST_SUPER_ADMIN',
              );
            const after = await tx.user.update({
              where: { id },
              data: { status: input.status },
              select: { id: true, status: true },
            });
            await tx.userSession.updateMany({
              where: { userId: id },
              data: { revokedAt: new Date(now()) },
            });
            await audit(
              tx,
              userId,
              request.id,
              'USER_STATUS',
              'User',
              id,
              { status: before.status },
              after,
              input.reason,
            );
            return after;
          },
          [id],
        ),
      };
    },
  );
  app.post(
    '/api/v1/admin/users/:id/revoke-sessions',
    auth(['SUPER_ADMIN', 'SUPPORT']),
    async (request) => {
      const id = z.uuid().parse((request.params as { id: string }).id);
      const { reason } = z
        .strictObject({ reason: z.string().min(5).max(1000) })
        .parse(request.body);
      return {
        data: await mutation(
          ctx,
          request,
          `/admin/users/${id}/revoke-sessions`,
          async (tx, userId) => {
            await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
            const revoked = await tx.userSession.updateMany({
              where: { userId: id, revokedAt: null },
              data: { revokedAt: new Date(now()) },
            });
            await audit(
              tx,
              userId,
              request.id,
              'REVOKE_SESSIONS',
              'User',
              id,
              null,
              { count: revoked.count },
              reason,
            );
            return { revokedCount: revoked.count };
          },
          [id],
        ),
      };
    },
  );
  app.patch(
    '/api/v1/admin/users/:id/role',
    auth(['SUPER_ADMIN']),
    async (request) => {
      const id = z.uuid().parse((request.params as { id: string }).id);
      const input = z
        .strictObject({
          role: z.enum([
            'PLAYER',
            'SUPER_ADMIN',
            'GAME_ADMIN',
            'SUPPORT',
            'ANALYST',
          ]),
          password: passwordSchema,
          reason: z.string().min(5).max(1000),
        })
        .parse(request.body);
      const actor = await db.user.findUniqueOrThrow({
        where: { id: principal(request).id },
      });
      assert(
        actor.passwordHash !== null &&
          (await argon2.verify(actor.passwordHash, input.password)),
        403,
        'STEP_UP_FAILED',
      );
      return {
        data: await mutation(
          ctx,
          request,
          `/admin/users/${id}/role`,
          async (tx, userId) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:admin-users'))`;
            const target = await tx.user.findUnique({
              where: { id },
              include: { admin: true },
            });
            assert(target, 404, 'NOT_FOUND');
            if (
              target.admin?.role === 'SUPER_ADMIN' &&
              input.role !== 'SUPER_ADMIN'
            )
              assert(
                (await tx.adminUser.count({
                  where: { role: 'SUPER_ADMIN', user: { status: 'ACTIVE' } },
                })) > 1,
                409,
                'LAST_SUPER_ADMIN',
              );
            if (input.role === 'PLAYER')
              await tx.adminUser.deleteMany({ where: { userId: id } });
            else
              await tx.adminUser.upsert({
                where: { userId: id },
                create: { userId: id, role: input.role },
                update: { role: input.role, version: { increment: 1 } },
              });
            await tx.userSession.updateMany({
              where: { userId: id },
              data: { revokedAt: new Date(now()) },
            });
            const log = await audit(
              tx,
              userId,
              request.id,
              'ADMIN_ROLE',
              'User',
              id,
              { role: target.admin?.role ?? 'PLAYER' },
              { role: input.role },
              input.reason,
            );
            return { userId: id, role: input.role, auditId: log.id };
          },
          [id],
        ),
      };
    },
  );
  app.get('/api/v1/admin/configs', auth(), async () => ({
    data: {
      items: await db.systemConfig.findMany({
        where: { key: 'game' },
        orderBy: { version: 'desc' },
        take: 50,
      }),
    },
  }));
  app.post(
    '/api/v1/admin/configs/:key/versions',
    auth(),
    async (request, reply) => {
      assert(
        (request.params as { key: string }).key === 'game',
        400,
        'UNKNOWN_CONFIG',
      );
      const input = z
        .strictObject({
          value: gameConfigSchema,
          schemaVersion: z.literal(1),
          reason: z.string().min(5).max(1000),
        })
        .parse(request.body);
      const data = await mutation(
        ctx,
        request,
        '/admin/configs/game/versions',
        async (tx, userId) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:game-config'))`;
          const version =
            ((
              await tx.systemConfig.aggregate({
                where: { key: 'game' },
                _max: { version: true },
              })
            )._max.version ?? 0) + 1;
          const value: GameConfig = { ...input.value, version };
          const draft = await tx.systemConfig.create({
            data: {
              key: 'game',
              version,
              schemaVersion: 1,
              value: json(value),
            },
          });
          await audit(
            tx,
            userId,
            request.id,
            'CREATE_CONFIG_DRAFT',
            'SystemConfig',
            draft.id,
            null,
            value,
            input.reason,
          );
          return draft;
        },
      );
      reply.code(201);
      return { data };
    },
  );
  app.post(
    '/api/v1/admin/configs/:key/versions/:version/publish',
    auth(['SUPER_ADMIN']),
    async (request) => {
      const params = z
        .object({
          key: z.literal('game'),
          version: z.coerce.number().int().positive(),
        })
        .parse(request.params);
      const input = z
        .strictObject({
          expectedActiveVersion: z.number().int().positive(),
          reason: z.string().min(5).max(1000),
        })
        .parse(request.body);
      return {
        data: await mutation(
          ctx,
          request,
          `/admin/configs/game/${params.version}/publish`,
          async (tx, userId) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fwo:game-config'))`;
            const old = await runtimeConfig(tx);
            assert(
              old.version === input.expectedActiveVersion,
              409,
              'VERSION_CONFLICT',
            );
            const target = await tx.systemConfig.findUnique({
              where: { key_version: { key: 'game', version: params.version } },
            });
            assert(target && !target.publishedAt, 409, 'CONFIG_NOT_DRAFT');
            const updated = await activateConfiguration(
              tx,
              gameConfigSchema.parse(target.value),
              now(),
            );
            await audit(
              tx,
              userId,
              request.id,
              'PUBLISH_CONFIG',
              'SystemConfig',
              updated.id,
              old.value,
              updated.value,
              input.reason,
            );
            return updated;
          },
        ),
      };
    },
  );
  app.get(
    '/api/v1/admin/audit-logs',
    auth(['SUPER_ADMIN', 'SUPPORT']),
    async () => ({
      data: {
        items: await db.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      },
    }),
  );
  app.get(
    '/api/v1/admin/wallet-transactions',
    auth(['SUPER_ADMIN', 'SUPPORT']),
    async () => {
      const transactions = await db.walletTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          wallet: {
            select: {
              userId: true,
              user: { select: { profile: { select: { username: true } } } },
            },
          },
        },
      });
      const items: AdminWalletTransactionDto[] = transactions.map(
        ({
          wallet,
          deltaGold,
          balanceAfterGold,
          createdAt,
          ...transaction
        }) => ({
          ...transaction,
          userId: wallet.userId,
          username: wallet.user.profile?.username ?? null,
          deltaGold: deltaGold.toString(),
          balanceAfterGold: balanceAfterGold.toString(),
          createdAt: createdAt.toISOString(),
        }),
      );
      return { data: { items } };
    },
  );
}
