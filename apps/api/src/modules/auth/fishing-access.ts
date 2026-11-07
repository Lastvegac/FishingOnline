import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Context, Principal } from '../../types.js';
import type { Database, Tx } from '../../db.js';
import { assert } from '../../lib/errors.js';

const cookieName = (ctx: Context) =>
  ctx.env.nodeEnv === 'production' ? '__Host-fwo-fishing' : 'fwo-fishing';
const csrfFor = (ctx: Context, token: string) =>
  createHmac('sha256', ctx.env.jwtSecret)
    .update(`fishing:${token}`)
    .digest('hex');
const equal = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/** An absolute deadline, never renewed by polling or replaying a cast. */
export async function grantFishingAccess(
  ctx: Context,
  reply: FastifyReply,
  actor: Principal,
  sessionId: string,
) {
  const row = await ctx.db.fishingSession.findFirst({
    where: { id: sessionId, userId: actor.id, castAt: { not: null } },
  });
  if (!row) return;
  // Two minutes to acknowledge/recover a result after the engine's five-minute limit.
  const deadline = row.expiresAt.getTime() + 120_000;
  const maxAge = Math.floor((deadline - ctx.now()) / 1000);
  if (maxAge <= 0) return;
  const token = ctx.app.jwt.sign({
    sub: actor.id,
    familyId: actor.familyId,
    purpose: 'finish-fishing',
    sessionId,
    exp: Math.floor(deadline / 1000),
  });
  const options = {
    path: '/',
    secure: ctx.env.nodeEnv === 'production',
    sameSite: 'lax' as const,
    maxAge,
  };
  reply.setCookie(cookieName(ctx), token, { ...options, httpOnly: true });
  reply.setCookie('fwo-fishing-csrf', csrfFor(ctx, token), options);
}

export function clearFishingAccess(ctx: Context, reply: FastifyReply) {
  for (const name of [cookieName(ctx), 'fwo-fishing-csrf'])
    reply.clearCookie(name, {
      path: '/',
      secure: ctx.env.nodeEnv === 'production',
      sameSite: 'lax',
    });
}

/** Rechecked under the player lock for every mutation, including receipt replays. */
export async function hasFishingAccess(
  db: Database | Tx,
  actor: Principal,
  now: number,
) {
  if (
    !actor.fishingSessionId ||
    !actor.fishingAccessExpiresAt ||
    actor.fishingAccessExpiresAt <= now
  )
    return false;
  const family = await db.userSession.findFirst({
    where: {
      userId: actor.id,
      familyId: actor.familyId,
      usedAt: null,
      revokedAt: null,
    },
  });
  if (!family) return false;
  const row = await db.fishingSession.findFirst({
    where: {
      id: actor.fishingSessionId,
      userId: actor.id,
      castAt: { not: null },
    },
  });
  return (
    !!row &&
    row.state !== 'IDLE' &&
    row.castAt!.getTime() <
      Math.min(
        family.expiresAt.getTime(),
        family.absoluteExpiresAt.getTime(),
      ) &&
    now < row.expiresAt.getTime() + 120_000
  );
}

/** Cookie authority is confined to explicitly opted-in reads and this cast's actions. */
export async function fishingPrincipal(
  ctx: Context,
  request: FastifyRequest,
  scope = request.routeOptions.config.fishingAccess,
): Promise<Principal | null> {
  const token = request.cookies[cookieName(ctx)];
  if (!scope || !token) return null;
  try {
    const claims = ctx.app.jwt.verify<{
      sub: string;
      familyId: string;
      purpose: string;
      sessionId: string;
      exp: number;
    }>(token, { ignoreExpiration: true });
    if (claims.purpose !== 'finish-fishing' || !Number.isFinite(claims.exp))
      return null;
    const actor: Principal = {
      id: claims.sub,
      familyId: claims.familyId,
      role: 'PLAYER',
      fishingSessionId: claims.sessionId,
      fishingAccessExpiresAt: claims.exp * 1000,
    };
    if (!(await hasFishingAccess(ctx.db, actor, ctx.now()))) return null;
    const id = (request.params as { id?: string } | undefined)?.id;
    if (scope === 'session' && id && id !== actor.fishingSessionId) return null;
    if (scope === 'context') {
      const row = await ctx.db.fishingSession.findUnique({
        where: { id: claims.sessionId },
      });
      if (row?.state === 'FINISHED') return null;
    }
    if (request.method !== 'GET') {
      const sent = request.headers['x-fishing-csrf'];
      assert(
        request.headers.origin &&
          ctx.env.allowedOrigins.includes(request.headers.origin) &&
          typeof sent === 'string' &&
          equal(sent, csrfFor(ctx, token)),
        403,
        'CSRF_FAILED',
      );
    }
    return actor;
  } catch {
    return null;
  }
}
