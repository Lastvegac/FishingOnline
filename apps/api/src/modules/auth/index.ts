import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import argon2 from 'argon2';
import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  updateProfileSchema,
  passwordSchema,
  otpVerifySchema,
  otpResendSchema,
  googleAuthSchema,
} from '@fwo/contracts';
import type { AuthProvidersDto } from '@fwo/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Context } from '../../types.js';
import { principal } from '../../types.js';
import { ApiError, assert } from '../../lib/errors.js';
import { lockPlayer, event, mutation } from '../../lib/transaction.js';
import { getPlayer, initializePlayer } from '../players/service.js';
import { createOtp } from './otp.js';
import { clearFishingAccess, fishingPrincipal } from './fishing-access.js';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const equal = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export const resetSchema = z.strictObject({
  token: z.string().min(32).max(256),
  password: passwordSchema,
});
export const forgotSchema = forgotPasswordSchema;
const normalizedUsername = (value: string) =>
  value.toLocaleLowerCase('vi').normalize('NFKC');
const argonOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
interface PendingRegistration {
  channel: 'EMAIL' | 'SMS';
  email?: string;
  phone?: string;
  username: string;
  passwordHash: string;
}
interface PendingProfile {
  username?: string;
  avatarKey?: string;
}

export function registerAuth(ctx: Context) {
  const { app, db, env, now } = ctx;
  const otp = createOtp(ctx);
  const cookieName =
    env.nodeEnv === 'production' ? '__Host-fwo-refresh' : 'fwo-refresh';
  const tokenValue = () => randomBytes(32).toString('base64url');
  const csrfFor = (refresh: string) =>
    createHmac('sha256', env.jwtSecret).update(`csrf:${refresh}`).digest('hex');
  function setCookies(reply: FastifyReply, refresh: string) {
    const common = {
      secure: env.nodeEnv === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 86400,
    };
    reply.setCookie(cookieName, refresh, { ...common, httpOnly: true });
    reply.setCookie('fwo-csrf', csrfFor(refresh), {
      ...common,
      httpOnly: false,
    });
  }
  function clearCookies(reply: FastifyReply) {
    reply.clearCookie(cookieName, {
      path: '/',
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
    });
    reply.clearCookie('fwo-csrf', {
      path: '/',
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
    });
  }
  function csrf(request: FastifyRequest) {
    assert(
      request.headers.origin &&
        env.allowedOrigins.includes(request.headers.origin),
      403,
      'CSRF_FAILED',
    );
    const refresh = request.cookies[cookieName];
    const sent = request.headers['x-csrf-token'];
    const cookie = request.cookies['fwo-csrf'];
    assert(
      refresh &&
        typeof sent === 'string' &&
        cookie &&
        equal(sent, cookie) &&
        equal(csrfFor(refresh), sent),
      403,
      'CSRF_FAILED',
    );
    return refresh;
  }
  async function signIn(
    userId: string,
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    clearFishingAccess(ctx, reply);
    const refresh = tokenValue();
    const familyId = randomUUID();
    await db.userSession.create({
      data: {
        userId,
        familyId,
        tokenHash: hash(refresh),
        deviceLabel: String(
          request.headers['user-agent'] ?? 'Trình duyệt',
        ).slice(0, 128),
        expiresAt: new Date(now() + 7 * 86400_000),
        absoluteExpiresAt: new Date(now() + 30 * 86400_000),
      },
    });
    setCookies(reply, refresh);
    const player = await getPlayer(db, userId);
    return {
      user: { id: player.id, email: player.email, phone: player.phone },
      profile: player,
      accessToken: app.jwt.sign(
        { sub: userId, familyId },
        { expiresIn: '10m' },
      ),
      expiresIn: 600,
    };
  }

  /** Field errors for identifiers/usernames already taken. Registration may disclose this; login may not. */
  async function assertAvailable(input: {
    email?: string;
    phone?: string;
    username?: string;
  }) {
    const [emailOwner, phoneOwner, usernameOwner] = await Promise.all([
      input.email
        ? db.user.findUnique({
            where: { emailNormalized: input.email },
            select: { id: true },
          })
        : null,
      input.phone
        ? db.user.findUnique({
            where: { phoneE164: input.phone },
            select: { id: true },
          })
        : null,
      input.username
        ? db.userProfile.findUnique({
            where: { normalizedUsername: normalizedUsername(input.username) },
            select: { id: true },
          })
        : null,
    ]);
    const fields = {
      ...(emailOwner ? { email: ['Email này đã được sử dụng.'] } : {}),
      ...(phoneOwner ? { phone: ['Số điện thoại này đã được sử dụng.'] } : {}),
      ...(usernameOwner
        ? { username: ['Tên nhân vật này đã được sử dụng.'] }
        : {}),
    };
    const taken = Object.keys(fields);
    if (taken.length)
      throw new ApiError(
        409,
        taken.length > 1
          ? 'ACCOUNT_DETAILS_UNAVAILABLE'
          : emailOwner
            ? 'EMAIL_UNAVAILABLE'
            : phoneOwner
              ? 'PHONE_UNAVAILABLE'
              : 'USERNAME_UNAVAILABLE',
        'Vui lòng kiểm tra các trường được đánh dấu.',
        { fields },
      );
  }
  async function createAccount(
    tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
    input: {
      email?: string;
      phone?: string;
      username: string;
      passwordHash: string | null;
      method: 'email' | 'phone' | 'google';
    },
  ) {
    const verifiedAt = new Date(now());
    const created = await tx.user.create({
      data: {
        emailNormalized: input.email ?? null,
        emailVerifiedAt: input.email ? verifiedAt : null,
        phoneE164: input.phone ?? null,
        phoneVerifiedAt: input.phone ? verifiedAt : null,
        passwordHash: input.passwordHash,
      },
    });
    await initializePlayer(tx, created.id, input.username, now());
    await event(tx, created.id, 'signup', { method: input.method }, now());
    return created;
  }

  app.get(
    '/api/v1/auth/providers',
    { schema: { tags: ['Auth'], summary: 'Hình thức đăng ký đang bật' } },
    async (): Promise<{ data: AuthProvidersDto }> => ({
      data: {
        email: ctx.canSend('EMAIL'),
        phone: ctx.canSend('SMS'),
        google: env.googleClientId ? { clientId: env.googleClientId } : null,
      },
    }),
  );
  app.post(
    '/api/v1/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Bước 1: kiểm tra thông tin và gửi OTP qua email hoặc SMS',
      },
      // Mobile carriers share IPs (CGNAT); per-destination limits in OTP issue add a tighter budget.
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const input = registerSchema.parse(request.body);
      const channel = input.channel === 'phone' ? 'SMS' : 'EMAIL';
      const destination = (
        input.channel === 'phone' ? input.phone : input.email
      )!;
      await assertAvailable(input);
      const pending: PendingRegistration = {
        channel,
        ...(input.channel === 'phone'
          ? { phone: input.phone }
          : { email: input.email }),
        username: input.username,
        passwordHash: await argon2.hash(input.password, argonOptions),
      };
      const challenge = await otp.issue({
        userId: null,
        purpose: 'REGISTER',
        channel,
        destination,
        payload: { ...pending },
      });
      reply.code(202);
      return { data: challenge };
    },
  );
  app.post(
    '/api/v1/auth/register/verify',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Bước 2: xác nhận OTP, tạo tài khoản và starter inventory',
      },
      config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const input = otpVerifySchema.parse(request.body);
      const user = await otp.guard(() =>
        db.$transaction(async (tx) => {
          const challenge = await otp.consume(tx, {
            ...input,
            purpose: 'REGISTER',
            userId: null,
          });
          const pending = challenge.payload as unknown as PendingRegistration;
          return createAccount(tx, {
            email: pending.email,
            phone: pending.phone,
            username: pending.username,
            passwordHash: pending.passwordHash,
            method: pending.channel === 'SMS' ? 'phone' : 'email',
          });
        }),
      );
      reply.code(201);
      return { data: await signIn(user.id, request, reply) };
    },
  );
  app.post(
    '/api/v1/auth/otp/resend',
    {
      schema: { tags: ['Auth'], summary: 'Gửi lại OTP đăng ký' },
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const { challengeId } = otpResendSchema.parse(request.body);
      reply.code(202);
      return { data: await otp.resend(challengeId, 'REGISTER', null) };
    },
  );
  app.post(
    '/api/v1/auth/google',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Đăng nhập hoặc đăng ký bằng Google ID token',
      },
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const input = googleAuthSchema.parse(request.body);
      assert(
        ctx.verifyGoogle,
        503,
        'GOOGLE_UNAVAILABLE',
        'Đăng nhập Google chưa được cấu hình.',
      );
      const google = await ctx.verifyGoogle(input.credential);
      const identity = await db.userIdentity.findUnique({
        where: {
          provider_subject: { provider: 'GOOGLE', subject: google.subject },
        },
        include: { user: true },
      });
      if (identity) {
        assert(
          identity.user.status === 'ACTIVE' && !identity.user.deletedAt,
          401,
          'INVALID_CREDENTIALS',
          'Tài khoản này hiện không thể đăng nhập.',
        );
        await db.$transaction((tx) =>
          event(tx, identity.userId, 'login', { method: 'google' }, now()),
        );
        return { data: await signIn(identity.userId, request, reply) };
      }
      // No silent linking: an existing email account must sign in with its own method first.
      const emailOwner = await db.user.findUnique({
        where: { emailNormalized: google.email },
        select: { id: true },
      });
      if (emailOwner)
        throw new ApiError(
          409,
          'EMAIL_UNAVAILABLE',
          'Email Google này đã có tài khoản. Vui lòng đăng nhập bằng email và mật khẩu.',
        );
      if (!input.username || !input.acceptTerms)
        throw new ApiError(
          422,
          'GOOGLE_PROFILE_REQUIRED',
          'Chọn tên cần thủ và đồng ý chính sách để hoàn tất đăng ký.',
          {
            fields: {
              ...(!input.username
                ? { username: ['Vui lòng chọn tên cần thủ.'] }
                : {}),
              ...(!input.acceptTerms
                ? { acceptTerms: ['Vui lòng xác nhận chính sách.'] }
                : {}),
            },
          },
        );
      await assertAvailable({ username: input.username });
      const user = await db.$transaction(async (tx) => {
        const created = await createAccount(tx, {
          email: google.email,
          username: input.username!,
          passwordHash: null,
          method: 'google',
        });
        await tx.userIdentity.create({
          data: {
            userId: created.id,
            provider: 'GOOGLE',
            subject: google.subject,
          },
        });
        return created;
      });
      reply.code(201);
      return { data: await signIn(user.id, request, reply) };
    },
  );
  app.post(
    '/api/v1/auth/login',
    {
      schema: { tags: ['Auth'] },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const identifier = (input.email ?? input.phone)!;
      await ctx.limitAuthAccount?.(`login:${hash(identifier)}`, 10, 5 * 60_000);
      const user = await db.user.findUnique({
        where: input.email
          ? { emailNormalized: input.email }
          : { phoneE164: input.phone },
      });
      const failure = new ApiError(
        401,
        'INVALID_CREDENTIALS',
        input.email
          ? 'Email hoặc mật khẩu chưa đúng.'
          : 'Số điện thoại hoặc mật khẩu chưa đúng.',
      );
      // Always hash/verify comparable work even when account or password does not exist.
      if (!user?.passwordHash) {
        await argon2.hash(input.password, argonOptions);
        throw failure;
      }
      if (
        user.status !== 'ACTIVE' ||
        user.deletedAt ||
        !(await argon2.verify(user.passwordHash, input.password))
      )
        throw failure;
      await db.$transaction((tx) =>
        event(
          tx,
          user.id,
          'login',
          { method: input.email ? 'email' : 'phone' },
          now(),
        ),
      );
      return { data: await signIn(user.id, request, reply) };
    },
  );
  app.post(
    '/api/v1/auth/refresh',
    {
      schema: { tags: ['Auth'] },
      config: { rateLimit: { max: 40, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const oldToken = csrf(request);
      const fresh = tokenValue();
      const result = await db.$transaction(async (tx) => {
        const first = await tx.userSession.findUnique({
          where: { tokenHash: hash(oldToken) },
        });
        if (!first) return null;
        await lockPlayer(tx, first.userId);
        const current = await tx.userSession.findUniqueOrThrow({
          where: { id: first.id },
          include: { user: true },
        });
        if (
          current.usedAt ||
          current.revokedAt ||
          current.user.status !== 'ACTIVE' ||
          current.user.deletedAt
        ) {
          await tx.userSession.updateMany({
            where: { familyId: current.familyId },
            data: { revokedAt: new Date(now()) },
          });
          return null;
        }
        // Natural expiry does not revoke a cast's bounded completion grant.
        if (
          current.expiresAt.getTime() <= now() ||
          current.absoluteExpiresAt.getTime() <= now()
        )
          return null;
        await tx.userSession.update({
          where: { id: current.id },
          data: { usedAt: new Date(now()) },
        });
        await tx.userSession.create({
          data: {
            userId: current.userId,
            familyId: current.familyId,
            parentId: current.id,
            tokenHash: hash(fresh),
            deviceLabel: current.deviceLabel,
            expiresAt: new Date(
              Math.min(
                now() + 7 * 86400_000,
                current.absoluteExpiresAt.getTime(),
              ),
            ),
            absoluteExpiresAt: current.absoluteExpiresAt,
          },
        });
        return { userId: current.userId, familyId: current.familyId };
      });
      if (!result) {
        clearCookies(reply);
        throw new ApiError(401, 'SESSION_EXPIRED');
      }
      setCookies(reply, fresh);
      return {
        data: {
          accessToken: app.jwt.sign(
            { sub: result.userId, familyId: result.familyId },
            { expiresIn: '10m' },
          ),
          expiresIn: 600,
        },
      };
    },
  );
  app.post(
    '/api/v1/auth/logout',
    { schema: { tags: ['Auth'] } },
    async (request, reply) => {
      if (request.cookies[cookieName]) {
        const refresh = csrf(request);
        const session = await db.userSession.findUnique({
          where: { tokenHash: hash(refresh) },
        });
        if (session)
          await db.$transaction(async (tx) => {
            await lockPlayer(tx, session.userId);
            await tx.userSession.updateMany({
              where: { familyId: session.familyId },
              data: { revokedAt: new Date(now()) },
            });
          });
      } else {
        const actor = await fishingPrincipal(ctx, request, 'context');
        if (actor)
          await db.$transaction(async (tx) => {
            await lockPlayer(tx, actor.id);
            await tx.userSession.updateMany({
              where: { userId: actor.id, familyId: actor.familyId },
              data: { revokedAt: new Date(now()) },
            });
          });
      }
      clearCookies(reply);
      clearFishingAccess(ctx, reply);
      return reply.code(204).send();
    },
  );
  app.get(
    '/api/v1/auth/fishing-resume',
    {
      config: { auth: true, fishingAccess: 'context' },
      schema: { tags: ['Auth'] },
    },
    async (request) => ({ data: await getPlayer(db, principal(request).id) }),
  );
  app.post(
    '/api/v1/auth/forgot-password',
    {
      schema: { tags: ['Auth'] },
      config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const input = forgotSchema.parse(request.body);
      const channel = input.email ? 'EMAIL' : 'SMS';
      await ctx.limitAuthAccount?.(
        `reset:${hash((input.email ?? input.phone)!)}`,
        3,
        3600_000,
      );
      // Probe the provider for existing and missing accounts alike so outages do not disclose accounts.
      await ctx.ready(channel);
      const user = await db.user.findUnique({
        where: input.email
          ? { emailNormalized: input.email }
          : { phoneE164: input.phone },
      });
      if (user?.status === 'ACTIVE') {
        const token = tokenValue();
        await db.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hash(token),
            expiresAt: new Date(now() + 30 * 60_000),
          },
        });
        const link = `${env.webOrigin}/?reset=${encodeURIComponent(token)}`;
        await ctx.sendMessage({
          channel,
          to: (input.email ?? input.phone)!,
          subject: 'Đặt lại mật khẩu Fishing World',
          text: `Mở liên kết để đặt mật khẩu mới (hiệu lực 30 phút): ${link}\nNếu bạn không yêu cầu, hãy bỏ qua tin này.`,
        });
      }
      reply.code(202);
      return {
        data: { message: 'Nếu tài khoản tồn tại, hướng dẫn đã được gửi.' },
      };
    },
  );
  app.post(
    '/api/v1/auth/reset-password',
    {
      schema: { tags: ['Auth'] },
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const { token, password } = resetSchema.parse(request.body);
      const passwordHash = await argon2.hash(password, argonOptions);
      await db.$transaction(async (tx) => {
        const reset = await tx.passwordResetToken.findUnique({
          where: { tokenHash: hash(token) },
        });
        assert(reset, 400, 'INVALID_RESET_TOKEN');
        await lockPlayer(tx, reset.userId);
        const current = await tx.passwordResetToken.findUniqueOrThrow({
          where: { id: reset.id },
        });
        assert(
          !current.usedAt && current.expiresAt.getTime() > now(),
          400,
          'INVALID_RESET_TOKEN',
        );
        await tx.passwordResetToken.updateMany({
          where: { userId: reset.userId, usedAt: null },
          data: { usedAt: new Date(now()) },
        });
        await tx.user.update({
          where: { id: reset.userId },
          data: { passwordHash },
        });
        await tx.userSession.updateMany({
          where: { userId: reset.userId },
          data: { revokedAt: new Date(now()) },
        });
      });
      clearCookies(reply);
      return reply.code(204).send();
    },
  );
  app.get(
    '/api/v1/users/me',
    { config: { auth: true }, schema: { tags: ['Users'] } },
    async (request) => ({ data: await getPlayer(db, principal(request).id) }),
  );
  app.post(
    '/api/v1/users/me/profile-otp',
    {
      config: { auth: true, rateLimit: { max: 10, timeWindow: '1 hour' } },
      schema: {
        tags: ['Users'],
        summary: 'Gửi OTP để xác nhận đổi tên/avatar (email không đổi được)',
      },
    },
    async (request, reply) => {
      const input = updateProfileSchema.parse(request.body);
      const userId = principal(request).id;
      const user = await db.user.findUniqueOrThrow({
        where: { id: userId },
        include: { profile: true },
      });
      const changes: PendingProfile = {
        ...(input.username && input.username !== user.profile!.username
          ? { username: input.username }
          : {}),
        ...(input.avatarKey && input.avatarKey !== user.profile!.avatarKey
          ? { avatarKey: input.avatarKey }
          : {}),
      };
      assert(
        Object.keys(changes).length,
        400,
        'NO_CHANGES',
        'Hồ sơ chưa có thay đổi nào.',
      );
      if (
        changes.username &&
        normalizedUsername(changes.username) !==
          user.profile!.normalizedUsername
      )
        await assertAvailable({ username: changes.username });
      // Email is preferred; phone-only accounts receive the code by SMS.
      const channel = user.emailNormalized ? 'EMAIL' : 'SMS';
      const challenge = await otp.issue({
        userId,
        purpose: 'PROFILE_UPDATE',
        channel,
        destination: (user.emailNormalized ?? user.phoneE164)!,
        payload: { ...changes },
      });
      reply.code(202);
      return { data: challenge };
    },
  );
  app.patch(
    '/api/v1/users/me',
    {
      config: { auth: true },
      schema: {
        tags: ['Users'],
        summary: 'Áp dụng thay đổi hồ sơ đã được xác thực bằng OTP',
      },
    },
    async (request) => {
      const input = otpVerifySchema.parse(request.body);
      const data = await otp.guard(() =>
        mutation(ctx, request, '/users/me', async (tx, userId) => {
          const challenge = await otp.consume(tx, {
            ...input,
            purpose: 'PROFILE_UPDATE',
            userId,
          });
          const changes = challenge.payload as PendingProfile;
          await tx.userProfile.update({
            where: { userId },
            data: {
              ...(changes.username
                ? {
                    username: changes.username,
                    normalizedUsername: normalizedUsername(changes.username),
                  }
                : {}),
              ...(changes.avatarKey ? { avatarKey: changes.avatarKey } : {}),
            },
          });
          // A received code proves control of the destination.
          await tx.user.update({
            where: { id: userId },
            data:
              challenge.channel === 'EMAIL'
                ? { emailVerifiedAt: new Date(now()) }
                : { phoneVerifiedAt: new Date(now()) },
          });
          await event(
            tx,
            userId,
            'profile_updated',
            { fields: Object.keys(changes).join(',') },
            now(),
          );
          return getPlayer(tx, userId);
        }),
      );
      return { data };
    },
  );
  app.get(
    '/api/v1/users/me/sessions',
    { config: { auth: true }, schema: { tags: ['Users'] } },
    async (request) => {
      const p = principal(request);
      const sessions = await db.userSession.findMany({
        where: {
          userId: p.id,
          revokedAt: null,
          usedAt: null,
          expiresAt: { gt: new Date(now()) },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return {
        data: sessions.map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          deviceLabel: s.deviceLabel,
          isCurrent: s.familyId === p.familyId,
        })),
      };
    },
  );
  app.delete(
    '/api/v1/users/me/sessions/:id',
    { config: { auth: true }, schema: { tags: ['Users'] } },
    async (request, reply) => {
      const id = z.uuid().parse((request.params as { id: string }).id);
      const session = await db.userSession.findFirst({
        where: { id, userId: principal(request).id },
      });
      assert(session, 404, 'NOT_FOUND');
      await db.$transaction(async (tx) => {
        await lockPlayer(tx, session.userId);
        await tx.userSession.updateMany({
          where: { familyId: session.familyId },
          data: { revokedAt: new Date(now()) },
        });
      });
      return reply.code(204).send();
    },
  );
}
