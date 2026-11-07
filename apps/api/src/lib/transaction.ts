import { createHash, randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Context } from '../types.js';
import { principal } from '../types.js';
import type { Tx } from '../db.js';
import { json, plain } from '../db.js';
import { assert } from './errors.js';
import { hasFishingAccess } from '../modules/auth/fishing-access.js';

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sorted(v)]),
    );
  return value;
}
export async function lockPlayer(tx: Tx, userId: string) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
}
export async function mutation<T>(
  ctx: Context,
  request: FastifyRequest,
  route: string,
  action: (tx: Tx, userId: string, key: string) => Promise<T>,
  additionalUserIds: string[] = [],
): Promise<T> {
  const userId = principal(request).id;
  const key = z.uuid().parse(request.headers['idempotency-key']);
  const bodyHash = createHash('sha256')
    .update(JSON.stringify(sorted(request.body ?? null)))
    .digest('hex');
  return ctx.db.$transaction(
    async (tx) => {
      for (const id of [...new Set([userId, ...additionalUserIds])].sort())
        await lockPlayer(tx, id);
      const actor = await tx.user.findUnique({
        where: { id: userId },
        include: { admin: true },
      });
      assert(
        actor && actor.status === 'ACTIVE' && !actor.deletedAt,
        401,
        'UNAUTHENTICATED',
      );
      const family = await tx.userSession.findFirst({
        where: {
          userId,
          familyId: principal(request).familyId,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date(ctx.now()) },
          absoluteExpiresAt: { gt: new Date(ctx.now()) },
        },
      });
      const actorPrincipal = principal(request);
      if (actorPrincipal.fishingSessionId) {
        assert(
          request.routeOptions.config.fishingAccess === 'session' &&
            (request.params as { id?: string }).id ===
              actorPrincipal.fishingSessionId &&
            (await hasFishingAccess(tx, actorPrincipal, ctx.now())),
          401,
          'UNAUTHENTICATED',
        );
      } else assert(family, 401, 'UNAUTHENTICATED');
      const allowedRoles = request.routeOptions.config.roles;
      if (allowedRoles)
        assert(
          allowedRoles.includes(actor.admin?.role ?? 'PLAYER'),
          403,
          'FORBIDDEN',
        );
      const existing = await tx.idempotencyRecord.findUnique({
        where: { userId_route_key: { userId, route, key } },
      });
      if (existing) {
        assert(existing.requestHash === bodyHash, 409, 'IDEMPOTENCY_CONFLICT');
        return existing.response as T;
      }
      const data = plain(await action(tx, userId, key));
      await tx.idempotencyRecord.create({
        data: {
          userId,
          route,
          key,
          requestHash: bodyHash,
          statusCode: 200,
          response: json(data),
          expiresAt: new Date(ctx.now() + 86_400_000),
        },
      });
      return data;
    },
    { timeout: 15_000, maxWait: 10_000 },
  );
}
export async function ledger(
  tx: Tx,
  userId: string,
  delta: bigint,
  reason: string,
  referenceId: string,
  now: number,
) {
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  const prior = await tx.walletTransaction.findUnique({
    where: {
      walletId_idempotencyKey: {
        walletId: wallet.id,
        idempotencyKey: `${reason}:${referenceId}`,
      },
    },
  });
  if (prior) return wallet;
  const next = wallet.balanceGold + delta;
  assert(next >= 0n, 422, 'INSUFFICIENT_GOLD', 'Bạn chưa có đủ Gold.');
  assert(next <= 9_000_000_000_000n, 422, 'BALANCE_LIMIT');
  if (delta !== 0n) {
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        deltaGold: delta,
        balanceAfterGold: next,
        reason,
        referenceType: reason,
        referenceId,
        idempotencyKey: `${reason}:${referenceId}`,
        createdAt: new Date(now),
      },
    });
    return tx.wallet.update({
      where: { id: wallet.id },
      data: { balanceGold: next },
    });
  }
  return wallet;
}
export async function event(
  tx: Tx,
  userId: string,
  eventName: string,
  properties: unknown,
  now: number,
) {
  await tx.analyticsEvent.create({
    data: {
      eventId: randomUUID(),
      userId,
      eventName,
      source: 'SERVER',
      properties: json(properties),
      occurredAt: new Date(now),
    },
  });
}
