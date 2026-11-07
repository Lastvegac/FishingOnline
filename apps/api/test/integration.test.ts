import 'dotenv/config';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sessionSchema, lakeCommunitySchema } from '@fwo/contracts';
import { DEFAULT_CONFIG, IDS } from '@fwo/game-config';
import type { EngineState } from '@fwo/game-core';
import { buildApp } from '../src/app.js';
import type { Database } from '../src/db.js';
import type { OutboundMessage } from '../src/types.js';
import { activateConfiguration } from '../src/modules/admin/config.js';
import { ledger, lockPlayer } from '../src/lib/transaction.js';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error(
    'Integration tests require an explicitly isolated TEST_DATABASE_URL ending in _test. They never run against the application database.',
  );
const clearIsolatedFixtures =
  'TRUNCATE TABLE users, system_configs, fish_species, fishing_locations, equipment, bait_types, missions, achievements CASCADE';
let app: FastifyInstance, db: Database;
let clock = Date.now();
// Captured email/SMS stand in for real inboxes; the latest message per destination wins.
const outbox = new Map<string, OutboundMessage>();
const codeFor = (to: string) => {
  const code = outbox.get(to)?.code;
  if (!code) throw new Error(`No OTP sent to ${to}`);
  return code;
};
const googleTokens = new Map<string, { subject: string; email: string }>();
interface Actor {
  id: string;
  token: string;
  cookies: Record<string, string>;
}
const headers = (actor: Actor, key = randomUUID()) => ({
  authorization: `Bearer ${actor.token}`,
  'idempotency-key': key,
  origin: 'http://localhost:5173',
});
async function register(channel: 'email' | 'phone' = 'email'): Promise<Actor> {
  const suffix = randomUUID().slice(0, 10);
  const destination =
    channel === 'email'
      ? `qa-${suffix}@example.test`
      : `+849${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
  const start = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    headers: { origin: 'http://localhost:5173' },
    payload: {
      channel,
      [channel]: destination,
      username: `qa-${suffix}`,
      password: '12345678',
      acceptTerms: true,
    },
  });
  expect(start.statusCode, start.body).toBe(202);
  const r = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/verify',
    headers: { origin: 'http://localhost:5173' },
    payload: {
      challengeId: start.json().data.challengeId,
      code: codeFor(destination),
    },
  });
  expect(r.statusCode, r.body).toBe(201);
  const value = r.json().data;
  return {
    id: value.profile.id,
    token: value.accessToken,
    cookies: Object.fromEntries(r.cookies.map((c) => [c.name, c.value])),
  };
}
beforeAll(async () => {
  const built = await buildApp({
    databaseUrl: url,
    jwtSecret: 'isolated-integration-test-secret-32-characters',
    now: () => clock,
    logger: false,
    disableRateLimit: true,
    sendMessage: async (message) => {
      outbox.set(message.to, message);
    },
    verifyGoogle: async (credential) => {
      const identity = googleTokens.get(credential);
      if (!identity) throw new Error('invalid test credential');
      return identity;
    },
    env: {
      nodeEnv: 'test',
      redisUrl: undefined,
      smtpHost: undefined,
      allowedOrigins: ['http://localhost:5173'],
    },
  });
  app = built.app;
  db = built.db;
  await app.ready();
  // This database is dedicated to this suite; TRUNCATE bypasses append-only DELETE triggers only here.
  await db.$executeRawUnsafe(clearIsolatedFixtures);
  await db.$transaction(async (tx) => {
    if (
      !(await tx.systemConfig.findFirst({
        where: { key: 'game', isActive: true },
      }))
    )
      await activateConfiguration(tx, DEFAULT_CONFIG, clock);
  });
}, 30_000);
afterAll(async () => {
  if (db) await db.$executeRawUnsafe(clearIsolatedFixtures);
  if (app) await app.close();
});

describe.sequential('PostgreSQL authoritative integration', () => {
  it('hashes passwords, issues real starter ledger, and blocks client role/Gold tampering', async () => {
    const actor = await register();
    const user = await db.user.findUniqueOrThrow({
      where: { id: actor.id },
      include: { wallet: { include: { transactions: true } } },
    });
    expect(user.passwordHash?.startsWith('$argon2id$')).toBe(true);
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.wallet!.balanceGold).toBe(200n);
    expect(user.wallet!.transactions).toHaveLength(1);
    const inventory = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/inventory',
        headers: headers(actor),
      })
    ).json().data;
    expect(
      inventory.items.find((i: { kind: string }) => i.kind === 'BAIT').quantity,
    ).toBe(20);
    expect(Object.keys(inventory.equipped)).toEqual(
      expect.arrayContaining(['ROD', 'LINE', 'HOOK']),
    );
    const tamper = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: headers(actor),
      payload: { gold: '999999', role: 'SUPER_ADMIN' },
    });
    expect(tamper.statusCode).toBe(400);
    expect(
      (await db.wallet.findUniqueOrThrow({ where: { userId: actor.id } }))
        .balanceGold,
    ).toBe(200n);
  });
  it('reports duplicate registration fields and keeps incorrect-login failures generic', async () => {
    const actor = await register();
    const user = await db.user.findUniqueOrThrow({
      where: { id: actor.id },
      include: { profile: true },
    });
    const unique = randomUUID().slice(0, 8);
    const emailConflict = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: user.emailNormalized,
        username: `new-${unique}`,
        password: '12345678',
        acceptTerms: true,
      },
    });
    expect(emailConflict.statusCode).toBe(409);
    expect(emailConflict.json().error.fields.email).toEqual([
      'Email này đã được sử dụng.',
    ]);
    const usernameConflict = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `new-${unique}@example.test`,
        username: user.profile!.username,
        password: '12345678',
        acceptTerms: true,
      },
    });
    expect(usernameConflict.statusCode).toBe(409);
    expect(usernameConflict.json().error.fields.username).toEqual([
      'Tên nhân vật này đã được sử dụng.',
    ]);
    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: user.emailNormalized, password: 'incorrect-password' },
    });
    const missingAccount = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: `missing-${unique}@example.test`,
        password: 'incorrect-password',
      },
    });
    for (const response of [wrongPassword, missingAccount]) {
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('INVALID_CREDENTIALS');
      expect(response.json().error.fields).toBeUndefined();
    }
    expect(wrongPassword.json().error.message).toBe(
      missingAccount.json().error.message,
    );
    const other = await register();
    const profileConflict = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile-otp',
      headers: headers(other),
      payload: { username: user.profile!.username },
    });
    expect(profileConflict.statusCode).toBe(409);
    expect(profileConflict.json().error.fields.username).toEqual([
      'Tên nhân vật này đã được sử dụng.',
    ]);
  });
  it('creates accounts only after a single-use OTP, counts wrong codes and throttles resends', async () => {
    const suffix = randomUUID().slice(0, 10);
    const email = `otp-${suffix}@example.test`;
    const start = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        username: `otp-${suffix}`,
        password: '12345678',
        acceptTerms: true,
      },
    });
    expect(start.statusCode, start.body).toBe(202);
    const challenge = start.json().data;
    expect(challenge.destination).not.toContain(email.split('@')[0]);
    expect(start.body).not.toContain(codeFor(email));
    expect(
      await db.user.findUnique({ where: { emailNormalized: email } }),
    ).toBeNull();
    const stored = await db.otpChallenge.findUniqueOrThrow({
      where: { id: challenge.challengeId },
    });
    expect(stored.codeHash).not.toContain(codeFor(email));
    const code = codeFor(email);
    const wrong = code === '000000' ? '111111' : '000000';
    const verify = (value: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/register/verify',
        payload: { challengeId: challenge.challengeId, code: value },
      });
    const miss = await verify(wrong);
    expect(miss.statusCode).toBe(400);
    expect(miss.json().error.code).toBe('OTP_INVALID');
    expect(miss.json().error.fields.code[0]).toContain('Còn 4 lần');
    const tooSoon = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/resend',
      payload: { challengeId: challenge.challengeId },
    });
    expect(tooSoon.statusCode).toBe(429);
    for (let i = 0; i < 4; i++) await verify(wrong);
    const locked = await verify(code);
    expect(locked.statusCode).toBe(429);
    expect(locked.json().error.code).toBe('OTP_LOCKED');
    clock += 61_000;
    const resent = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/resend',
      payload: { challengeId: challenge.challengeId },
    });
    expect(resent.statusCode, resent.body).toBe(202);
    const fresh = codeFor(email);
    const created = await verify(fresh);
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json().data.profile.email).toBe(email);
    const reused = await verify(fresh);
    expect(reused.statusCode).toBe(400);
    expect(reused.json().error.code).toBe('OTP_EXPIRED');
    expect(
      (
        await db.otpChallenge.findUniqueOrThrow({
          where: { id: challenge.challengeId },
        })
      ).payload,
    ).toEqual({});
    const expiredStart = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `late-${suffix}@example.test`,
        username: `late-${suffix}`,
        password: '12345678',
        acceptTerms: true,
      },
    });
    clock += 11 * 60_000;
    const late = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register/verify',
      payload: {
        challengeId: expiredStart.json().data.challengeId,
        code: codeFor(`late-${suffix}@example.test`),
      },
    });
    expect(late.statusCode).toBe(400);
    expect(late.json().error.code).toBe('OTP_EXPIRED');
  });
  it('registers and signs in by Vietnamese phone with SMS OTP', async () => {
    const actor = await register('phone');
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
    expect(user.emailNormalized).toBeNull();
    expect(user.phoneE164).toMatch(/^\+849\d{8}$/);
    expect(user.phoneVerifiedAt).not.toBeNull();
    expect(outbox.get(user.phoneE164!)?.channel).toBe('SMS');
    const local = `0${user.phoneE164!.slice(3)}`;
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { phone: local, password: '12345678' },
    });
    expect(login.statusCode, login.body).toBe(200);
    expect(login.json().data.profile.phone).toBe(user.phoneE164);
    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        channel: 'phone',
        phone: local,
        username: `dup-${randomUUID().slice(0, 8)}`,
        password: '12345678',
        acceptTerms: true,
      },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.fields.phone).toEqual([
      'Số điện thoại này đã được sử dụng.',
    ]);
    // Phone-only accounts confirm profile changes by SMS.
    const otp = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile-otp',
      headers: headers(actor),
      payload: { avatarKey: 'angler-3' },
    });
    expect(otp.statusCode, otp.body).toBe(202);
    expect(otp.json().data.channel).toBe('SMS');
  });
  it('requires an email OTP for name/avatar changes and never changes email', async () => {
    const actor = await register();
    const before = await db.user.findUniqueOrThrow({
      where: { id: actor.id },
      include: { profile: true },
    });
    const emailChange = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile-otp',
      headers: headers(actor),
      payload: { email: 'hijack@example.test' },
    });
    expect(emailChange.statusCode).toBe(400);
    const direct = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: headers(actor),
      payload: { username: 'Không qua OTP' },
    });
    expect(direct.statusCode).toBe(400);
    const newName = `Tên ${randomUUID().slice(0, 6)}`;
    const requested = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile-otp',
      headers: headers(actor),
      payload: { username: newName, avatarKey: 'angler-2' },
    });
    expect(requested.statusCode, requested.body).toBe(202);
    expect(requested.json().data.channel).toBe('EMAIL');
    const challengeId = requested.json().data.challengeId;
    const code = codeFor(before.emailNormalized!);
    const wrong = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: headers(actor),
      payload: { challengeId, code: code === '000000' ? '111111' : '000000' },
    });
    expect(wrong.statusCode).toBe(400);
    expect(wrong.json().error.fields.code).toBeDefined();
    expect(
      (await db.userProfile.findUniqueOrThrow({ where: { userId: actor.id } }))
        .username,
    ).toBe(before.profile!.username);
    const other = await register();
    const stolen = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: headers(other),
      payload: { challengeId, code },
    });
    expect(stolen.statusCode).toBe(400);
    const key = randomUUID();
    const applied = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: headers(actor, key),
      payload: { challengeId, code },
    });
    expect(applied.statusCode, applied.body).toBe(200);
    expect(applied.json().data).toMatchObject({
      username: newName,
      avatarKey: 'angler-2',
      email: before.emailNormalized,
    });
    const replay = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: headers(actor, key),
      payload: { challengeId, code },
    });
    expect(replay.statusCode).toBe(200);
    const reuse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: headers(actor),
      payload: { challengeId, code },
    });
    expect(reuse.statusCode).toBe(400);
    const unchanged = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/profile-otp',
      headers: headers(actor),
      payload: { username: newName },
    });
    expect(unchanged.statusCode).toBe(400);
    expect(unchanged.json().error.code).toBe('NO_CHANGES');
    await expect(
      db.user.update({
        where: { id: actor.id },
        data: { emailNormalized: `changed-${randomUUID()}@example.test` },
      }),
    ).rejects.toThrow();
  });
  it('signs up with a verified Google identity without silently linking existing emails', async () => {
    const suffix = randomUUID().slice(0, 10);
    const credential = `google-credential-${suffix}`;
    googleTokens.set(credential, {
      subject: `google-${suffix}`,
      email: `g-${suffix}@example.test`,
    });
    const needsProfile = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { credential },
    });
    expect(needsProfile.statusCode).toBe(422);
    expect(needsProfile.json().error.fields.username).toBeDefined();
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { credential, username: `g-${suffix}`, acceptTerms: true },
    });
    expect(created.statusCode, created.body).toBe(201);
    const id = created.json().data.profile.id;
    const user = await db.user.findUniqueOrThrow({ where: { id } });
    expect(user.passwordHash).toBeNull();
    expect(user.emailVerifiedAt).not.toBeNull();
    const again = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: { credential },
    });
    expect(again.statusCode).toBe(200);
    expect(again.json().data.profile.id).toBe(id);
    const passwordLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: user.emailNormalized, password: '12345678' },
    });
    expect(passwordLogin.statusCode).toBe(401);
    const existing = await register();
    const existingUser = await db.user.findUniqueOrThrow({
      where: { id: existing.id },
    });
    const collision = `google-collision-${suffix}`;
    googleTokens.set(collision, {
      subject: `google-other-${suffix}`,
      email: existingUser.emailNormalized!,
    });
    const linked = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        credential: collision,
        username: `x-${suffix}`,
        acceptTerms: true,
      },
    });
    expect(linked.statusCode).toBe(409);
    expect(
      await db.userIdentity.count({ where: { userId: existing.id } }),
    ).toBe(0);
    const providers = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/providers',
    });
    expect(providers.json().data).toMatchObject({ email: true, phone: true });
  });
  it('rotates refresh cookies, enforces CSRF, and revokes the whole family on reuse', async () => {
    const actor = await register();
    const missing = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: actor.cookies,
      headers: { origin: 'http://localhost:5173' },
    });
    expect(missing.statusCode).toBe(403);
    const rotated = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: actor.cookies,
      headers: {
        origin: 'http://localhost:5173',
        'x-csrf-token': actor.cookies['fwo-csrf'],
      },
    });
    expect(rotated.statusCode, rotated.body).toBe(200);
    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: actor.cookies,
      headers: {
        origin: 'http://localhost:5173',
        'x-csrf-token': actor.cookies['fwo-csrf'],
      },
    });
    expect(replay.statusCode).toBe(401);
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${rotated.json().data.accessToken}` },
    });
    expect(me.statusCode).toBe(401);
  });
  it('resets a one-use hashed password token and revokes existing sessions', async () => {
    const actor = await register();
    const token = randomBytes(32).toString('hex');
    await db.passwordResetToken.create({
      data: {
        userId: actor.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(clock + 1800000),
      },
    });
    const password = 'reset888';
    const reset = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: { token, password },
    });
    expect(reset.statusCode, reset.body).toBe(204);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/users/me',
          headers: headers(actor),
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/reset-password',
          payload: { token, password },
        })
      ).statusCode,
    ).toBe(400);
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: user.emailNormalized, password },
    });
    expect(login.statusCode, login.body).toBe(200);
    const forgot = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: user.emailNormalized },
    });
    expect(forgot.statusCode).toBe(202);
    expect(forgot.body).not.toContain('reset=');
    expect(outbox.get(user.emailNormalized!)?.text).toContain('/?reset=');
  });
  it('charges upgrades once, checks ownership, and requires complete equipment before fishing', async () => {
    const actor = await register(),
      other = await register();
    const rod = await db.userInventory.findFirstOrThrow({
      where: { userId: actor.id, equipmentId: IDS.woodRod },
    });
    const key = randomUUID();
    const payload = { inventoryItemId: rod.id, expectedUpgradeLevel: 0 };
    const upgraded = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/upgrade',
      headers: headers(actor, key),
      payload,
    });
    expect(upgraded.statusCode, upgraded.body).toBe(200);
    expect(upgraded.json().data.player.gold).toBe('100');
    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/upgrade',
      headers: headers(actor, key),
      payload,
    });
    expect(replay.statusCode).toBe(200);
    expect(
      (await db.wallet.findUniqueOrThrow({ where: { userId: actor.id } }))
        .balanceGold,
    ).toBe(100n);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/inventory/equip',
          headers: headers(other),
          payload: { inventoryItemId: rod.id },
        })
      ).statusCode,
    ).toBe(422);
    const line = await db.userInventory.findFirstOrThrow({
      where: { userId: actor.id, equipmentId: IDS.line },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/unequip',
      headers: headers(actor),
      payload: { slot: 'LINE' },
    });
    const bait = await db.userInventory.findFirstOrThrow({
      where: { userId: actor.id, baitTypeId: IDS.worm },
    });
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/v1/fishing/sessions',
      headers: headers(actor),
      payload: { locationId: IDS.lake, baitInventoryId: bait.id },
    });
    expect(invalid.statusCode).toBe(422);
    expect(invalid.json().error.code).toBe('EQUIPMENT_INCOMPLETE');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/inventory/equip',
          headers: headers(actor),
          payload: { inventoryItemId: line.id },
        })
      ).statusCode,
    ).toBe(200);
  });
  it('limits the free bait rescue to eligible players once per Vietnam day', async () => {
    const actor = await register();
    const ineligible = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/rescue',
      headers: headers(actor),
      payload: {},
    });
    expect(ineligible.statusCode).toBe(422);
    await db.$transaction(async (tx) => {
      await lockPlayer(tx, actor.id);
      await ledger(
        tx,
        actor.id,
        -180n,
        'TEST_FIXTURE_SPEND',
        randomUUID(),
        clock,
      );
      await tx.userInventory.updateMany({
        where: { userId: actor.id, baitTypeId: IDS.worm },
        data: { quantity: 0 },
      });
    });
    const granted = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/rescue',
      headers: headers(actor),
      payload: {},
    });
    expect(granted.statusCode, granted.body).toBe(200);
    expect(
      (
        await db.userInventory.findFirstOrThrow({
          where: { userId: actor.id, baitTypeId: IDS.worm },
        })
      ).quantity,
    ).toBe(5);
    await db.userInventory.updateMany({
      where: { userId: actor.id, baitTypeId: IDS.worm },
      data: { quantity: 0 },
    });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/inventory/rescue',
          headers: headers(actor),
          payload: {},
        })
      ).statusCode,
    ).toBe(409);
    expect(await db.userGrant.count({ where: { userId: actor.id } })).toBe(1);
  });
  it('prevents duplicate shop debits and rejects stale keys with different payloads', async () => {
    const actor = await register();
    const key = randomUUID();
    const config = await db.systemConfig.findFirstOrThrow({
      where: { key: 'game', isActive: true },
    });
    const input = {
      shopItemId: DEFAULT_CONFIG.shop.find((i) => i.slug === 'worm-pack')!.id,
      quantity: 1,
      expectedUnitPriceGold: '30',
      configVersion: config.version,
    };
    const responses = await Promise.all(
      [0, 1].map(() =>
        app.inject({
          method: 'POST',
          url: '/api/v1/shop/orders',
          headers: headers(actor, key),
          payload: input,
        }),
      ),
    );
    expect(responses.map((r) => r.statusCode)).toEqual([201, 201]);
    expect(responses[0].json().data.orderId).toBe(
      responses[1].json().data.orderId,
    );
    expect(
      (await db.wallet.findUniqueOrThrow({ where: { userId: actor.id } }))
        .balanceGold,
    ).toBe(170n);
    const changed = await app.inject({
      method: 'POST',
      url: '/api/v1/shop/orders',
      headers: headers(actor, key),
      payload: { ...input, quantity: 2 },
    });
    expect(changed.statusCode).toBe(409);
    const insufficient = await app.inject({
      method: 'POST',
      url: '/api/v1/shop/orders',
      headers: headers(actor),
      payload: { ...input, quantity: 100 },
    });
    expect(insufficient.statusCode).toBe(422);
    expect(await db.shopOrder.count({ where: { userId: actor.id } })).toBe(1);
  });
  it('sells terrain goods only at unlocked spots and buys them back once per key', async () => {
    const actor = await register();
    // Level 5 (1600 XP): brackish estuary open, coast (level 6) still locked.
    await db.userProfile.update({
      where: { userId: actor.id },
      data: { totalXp: 1600 },
    });
    const config = await db.systemConfig.findFirstOrThrow({
      where: { key: 'game', isActive: true },
    });
    const shrimp = DEFAULT_CONFIG.shop.find((i) => i.slug === 'shrimp-pack')!;
    const order = (locationId?: string) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/shop/orders',
        headers: headers(actor),
        payload: {
          shopItemId: shrimp.id,
          quantity: 1,
          expectedUnitPriceGold: shrimp.priceGold,
          configVersion: config.version,
          ...(locationId ? { locationId } : {}),
        },
      });
    expect((await order()).json().error.code).toBe('LOCAL_SHOP_REQUIRED');
    expect((await order(IDS.forest)).json().error.code).toBe(
      'LOCAL_SHOP_REQUIRED',
    );
    expect((await order(IDS.coast)).json().error.code).toBe('LOCATION_LOCKED');
    expect((await order(IDS.brackish)).statusCode).toBe(201);

    const coastShop = await app.inject({
      method: 'GET',
      url: `/api/v1/shop?locationId=${IDS.coast}`,
      headers: headers(actor),
    });
    const slugs = coastShop
      .json()
      .data.items.map((i: { slug: string }) => i.slug);
    expect(slugs).toContain('squid-pack');
    expect(slugs).toContain('worm-pack');
    expect(slugs).not.toContain('snail-pack');

    const bait = await db.userInventory.findFirstOrThrow({
      where: { userId: actor.id, baitTypeId: IDS.shrimp },
    });
    const saleKey = randomUUID();
    const sell = (quantity: number, key = randomUUID(), item = shrimp) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/shop/sales',
        headers: headers(actor, key),
        payload: {
          shopItemId: item.id,
          inventoryItemId:
            item.slug === 'worm-pack' ? wormInventory.id : bait.id,
          quantity,
          expectedUnitPriceGold: item.sellPriceGold ?? '1',
          configVersion: config.version,
          locationId: IDS.brackish,
        },
      });
    const wormInventory = await db.userInventory.findFirstOrThrow({
      where: { userId: actor.id, baitTypeId: IDS.worm },
    });
    const replayed = await Promise.all([sell(10, saleKey), sell(10, saleKey)]);
    expect(replayed.map((r) => r.statusCode)).toEqual([201, 201]);
    expect(replayed[0].json().data.saleId).toBe(replayed[1].json().data.saleId);
    expect(replayed[0].json().data.totalGold).toBe('30');
    // 200 starter − 50 shrimp pack + 10 × 3 buy-back, credited once.
    expect(
      (await db.wallet.findUniqueOrThrow({ where: { userId: actor.id } }))
        .balanceGold,
    ).toBe(180n);
    expect(
      (await db.userInventory.findUniqueOrThrow({ where: { id: bait.id } }))
        .quantity,
    ).toBe(0);
    expect((await sell(1)).json().error.code).toBe('INSUFFICIENT_QUANTITY');
    const worm = DEFAULT_CONFIG.shop.find((i) => i.slug === 'worm-pack')!;
    expect((await sell(1, randomUUID(), worm)).json().error.code).toBe(
      'NOT_SELLABLE',
    );
  });
  it('serializes finite shop stock across different players', async () => {
    const [a, b] = await Promise.all([register(), register()]);
    const item = DEFAULT_CONFIG.shop.find((i) => i.slug === 'worm-pack')!;
    await db.shopItem.update({ where: { id: item.id }, data: { stock: 1 } });
    const config = await db.systemConfig.findFirstOrThrow({
      where: { key: 'game', isActive: true },
    });
    const responses = await Promise.all(
      [a, b].map((actor) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/shop/orders',
          headers: headers(actor),
          payload: {
            shopItemId: item.id,
            quantity: 1,
            expectedUnitPriceGold: '30',
            configVersion: config.version,
          },
        }),
      ),
    );
    expect(responses.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(
      (await db.shopItem.findUniqueOrThrow({ where: { id: item.id } })).stock,
    ).toBe(0);
    await db.shopItem.update({ where: { id: item.id }, data: { stock: null } });
  });
  it('runs cast→bite→hook→fight→catch, credits once, updates collection and guards ownership', async () => {
    const actor = await register();
    const other = await register();
    const bait = await db.userInventory.findFirstOrThrow({
      where: { userId: actor.id, baitTypeId: IDS.worm },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/fishing/sessions',
      headers: headers(actor),
      payload: { locationId: IDS.lake, baitInventoryId: bait.id },
    });
    expect(created.statusCode, created.body).toBe(201);
    let session = sessionSchema.parse(created.json().data);
    const fakeComplete = await app.inject({
      method: 'POST',
      url: `/api/v1/fishing/sessions/${session.id}/complete`,
      headers: headers(actor),
      payload: { expectedVersion: session.version },
    });
    expect(fakeComplete.statusCode).toBe(409);
    const ownership = await app.inject({
      method: 'GET',
      url: `/api/v1/fishing/sessions/${session.id}`,
      headers: headers(other),
    });
    expect(ownership.statusCode).toBe(404);
    const castKey = randomUUID();
    const cast = await app.inject({
      method: 'POST',
      url: `/api/v1/fishing/sessions/${session.id}/cast`,
      headers: headers(actor, castKey),
      payload: { expectedVersion: session.version, aim: 0.5, power: 0.7 },
    });
    expect(cast.statusCode, cast.body).toBe(200);
    session = sessionSchema.parse(cast.json().data);
    expect(JSON.stringify(session)).not.toMatch(
      /selectedFish|selectedWeight|biteAt|fishPool|configSnapshot/,
    );
    const row = await db.fishingSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    clock = (row.simulation as unknown as EngineState).biteAt! + 100;
    session = sessionSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/fishing/sessions/${session.id}`,
          headers: headers(actor),
        })
      ).json().data,
    );
    expect(session.state).toBe('BITE');
    const hooked = await app.inject({
      method: 'POST',
      url: `/api/v1/fishing/sessions/${session.id}/hook`,
      headers: headers(actor),
      payload: { expectedVersion: session.version },
    });
    expect(hooked.statusCode, hooked.body).toBe(200);
    session = sessionSchema.parse(hooked.json().data);
    for (
      let tick = 0;
      tick < 180 && !['CAUGHT', 'ESCAPED'].includes(session.state);
      tick++
    ) {
      clock += 250;
      const r = await app.inject({
        method: 'POST',
        url: `/api/v1/fishing/sessions/${session.id}/reel`,
        headers: headers(actor),
        payload: {
          expectedVersion: session.version,
          action: session.tension < 65 ? 'hold' : 'release',
        },
      });
      expect(r.statusCode, r.body).toBe(200);
      session = sessionSchema.parse(r.json().data);
    }
    expect(session.state).toBe('CAUGHT');
    expect(session.catch).toBeDefined();
    expect(session.catch!.lengthCm).toBeGreaterThan(0);
    expect(session.catch!.locationId).toBe(IDS.lake);
    expect(session.catch!.baitSlug).toBe('worm');
    expect(session.simulator!.distanceM).toBe(0);
    const collectionRecord = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/collection',
        headers: headers(actor),
      })
    )
      .json()
      .data.items.find(
        (i: { fish: { id: string } }) => i.fish.id === session.catch!.fish.id,
      );
    expect(collectionRecord.bestCatch.lengthCm).toBe(session.catch!.lengthCm);
    const chatKey = randomUUID();
    const shareFish = (owner = actor, key = chatKey) =>
      app.inject({
        method: 'POST',
        url: `/api/v1/fishing/locations/${IDS.lake}/messages`,
        headers: headers(owner, key),
        payload: { text: 'A real catch', catchId: session.catch!.id },
      });
    const shared = await Promise.all([shareFish(), shareFish()]);
    expect(shared.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(shared[0].json().data.id).toBe(shared[1].json().data.id);
    expect(shared[0].json().data.catch.lengthCm).toBe(session.catch!.lengthCm);
    const stranger = await register();
    expect((await shareFish(stranger, randomUUID())).statusCode).toBe(404);
    const room = lakeCommunitySchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/fishing/locations/${IDS.lake}/community`,
          headers: headers(actor),
        })
      ).json().data,
    );
    expect(room.week.entries.find((r) => r.userId === actor.id)?.weightG).toBe(
      session.catch!.weightG,
    );
    expect(
      room.messages.filter((m) => m.id === shared[0].json().data.id),
    ).toHaveLength(1);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/fishing/locations/${IDS.lake}/messages`,
          headers: headers(actor),
          payload: { text: 'Too soon' },
        })
      ).statusCode,
    ).toBe(429);
    const player = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: headers(actor),
      })
    ).json().data;
    expect(player.totalFish).toBe(1);
    // Catch grants XP/collection now; Gold is credited only by manual exchange.
    expect(BigInt(player.gold)).toBe(200n);
    expect(session.catch!.goldDelivery).toBe('EXCHANGE');
    const exchangeKey = randomUUID();
    const exchangeUrl = `/api/v1/inventory/catches/${session.catch!.id}/exchange`;
    const exchangeInput = { expectedGold: session.catch!.gold };
    const exchanged = await app.inject({
      method: 'POST',
      url: exchangeUrl,
      headers: headers(actor, exchangeKey),
      payload: exchangeInput,
    });
    expect(exchanged.statusCode, exchanged.body).toBe(200);
    expect(BigInt(exchanged.json().data.player.gold)).toBe(
      200n + BigInt(session.catch!.gold),
    );
    const exchangeReplay = await app.inject({
      method: 'POST',
      url: exchangeUrl,
      headers: headers(actor, exchangeKey),
      payload: exchangeInput,
    });
    expect(exchangeReplay.json().data).toEqual(exchanged.json().data);
    expect(await db.fishingCatch.count({ where: { userId: actor.id } })).toBe(
      1,
    );
    const replay = await app.inject({
      method: 'POST',
      url: `/api/v1/fishing/sessions/${session.id}/cast`,
      headers: headers(actor, castKey),
      payload: { expectedVersion: 0, aim: 0.5, power: 0.7 },
    });
    expect(replay.statusCode).toBe(200);
    expect(
      (await db.userInventory.findUniqueOrThrow({ where: { id: bait.id } }))
        .quantity,
    ).toBe(19);
    for (let i = 0; i < 2; i++) {
      const completed = await app.inject({
        method: 'POST',
        url: `/api/v1/fishing/sessions/${session.id}/complete`,
        headers: headers(actor),
        payload: { expectedVersion: session.version },
      });
      expect(completed.statusCode, completed.body).toBe(200);
      session = sessionSchema.parse(completed.json().data);
    }
    expect(session.state).toBe('FINISHED');
    expect(session.catch).toBeDefined();
    expect(
      await db.analyticsEvent.count({
        where: { userId: actor.id, eventName: 'session_ended' },
      }),
    ).toBe(1);
    expect(await db.fishCollection.count({ where: { userId: actor.id } })).toBe(
      1,
    );
    expect(
      await db.userAchievement.count({ where: { userId: actor.id } }),
    ).toBeGreaterThanOrEqual(1);
    // Controlled mission fixture exercises the same transactional claim path without adding a force-win endpoint.
    const mission = await db.userMission.findFirstOrThrow({
      where: { userId: actor.id, missionId: DEFAULT_CONFIG.missions[0].id },
    });
    await db.userMission.update({
      where: { id: mission.id },
      data: { progress: 3, completedAt: new Date(clock) },
    });
    const claims = await Promise.all(
      [0, 1].map(() =>
        app.inject({
          method: 'POST',
          url: `/api/v1/missions/${mission.missionId}/claim`,
          headers: headers(actor),
          payload: { periodKey: mission.periodKey },
        }),
      ),
    );
    expect(claims.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const after = await db.userProfile.findUniqueOrThrow({
      where: { userId: actor.id },
    });
    expect(after.totalXp).toBe(
      player.totalXp + DEFAULT_CONFIG.missions[0].rewardXp,
    );
  }, 30_000);
  it('enforces append-only ledger and rejects balance changes without matching history at commit', async () => {
    const actor = await register();
    const wallet = await db.wallet.findUniqueOrThrow({
      where: { userId: actor.id },
    });
    await expect(
      db.walletTransaction.updateMany({
        where: { walletId: wallet.id },
        data: { deltaGold: 999n },
      }),
    ).rejects.toThrow();
    await expect(
      db.wallet.update({
        where: { id: wallet.id },
        data: { balanceGold: 9999n },
      }),
    ).rejects.toThrow();
    expect(
      (await db.wallet.findUniqueOrThrow({ where: { id: wallet.id } }))
        .balanceGold,
    ).toBe(200n);
  });
  it('restricts admin endpoints and preserves archived flags across unrelated content edits', async () => {
    const actor = await register();
    const denied = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/fish',
      headers: headers(actor),
    });
    expect(denied.statusCode).toBe(403);
    await db.adminUser.create({
      data: { userId: actor.id, role: 'SUPER_ADMIN' },
    });
    const fishId = DEFAULT_CONFIG.fish.find(
      (f) => f.rarity === 'LEGENDARY',
    )!.id;
    const archived = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/fish/${fishId}`,
      headers: headers(actor),
      payload: { active: false, reason: 'Integration archive test' },
    });
    expect(archived.statusCode, archived.body).toBe(200);
    const edited = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/equipment/${IDS.bambooRod}`,
      headers: headers(actor),
      payload: {
        name: 'Cần tre kiểm thử',
        reason: 'Integration unrelated edit',
      },
    });
    expect(edited.statusCode, edited.body).toBe(200);
    expect(
      (await db.fishSpecies.findUniqueOrThrow({ where: { id: fishId } }))
        .active,
    ).toBe(false);
    expect(await db.auditLog.count({ where: { actorId: actor.id } })).toBe(2);
    await db.fishSpecies.update({
      where: { id: fishId },
      data: { active: true },
    });
  });
});
