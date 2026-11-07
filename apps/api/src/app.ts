import 'dotenv/config';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Redis } from 'ioredis';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { createDatabase, plain } from './db.js';
import type { Context, Environment } from './types.js';
import { ApiError, assert } from './lib/errors.js';
import { registerAuth } from './modules/auth/index.js';
import { fishingPrincipal } from './modules/auth/fishing-access.js';
import { registerCharacters } from './modules/characters/index.js';
import { registerFashionPasses } from './modules/characters/passes.js';
import { registerFashion } from './modules/characters/fashion.js';
import { registerPlayers } from './modules/players/index.js';
import { registerFishing } from './modules/fishing/index.js';
import { registerAdmin } from './modules/admin/index.js';
import { registerAnalytics } from './modules/analytics/index.js';
import { registerPayments } from './modules/payments/index.js';
import type { PaymentConfig } from './modules/payments/config.js';
import type { GatewayFetch } from './modules/payments/gateways.js';
import { googleVerifier } from './modules/auth/google.js';
import { createMessaging } from './lib/messaging.js';
import type { GoogleIdentity, MessageSender } from './types.js';
import { installRouteSchemas } from './lib/openapi.js';
import {
  accountConflictDetails,
  ajvValidationDetails,
  zodValidationDetails,
} from './lib/validation-errors.js';
import type { AjvIssue, ValidationDetails } from './lib/validation-errors.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    auth?: boolean;
    roles?: string[];
    fishingAccess?: 'context' | 'session';
  }
}
export interface AppOptions {
  databaseUrl?: string;
  jwtSecret?: string;
  now?: () => number;
  logger?: boolean;
  env?: Partial<Environment>;
  disableRateLimit?: boolean;
  /** Test seam: capture outgoing email/SMS instead of using SMTP or the SMS webhook. */
  sendMessage?: MessageSender;
  /** Test seam: replace Google ID token verification. */
  verifyGoogle?: (credential: string) => Promise<GoogleIdentity>;
  paymentConfig?: PaymentConfig;
  paymentFetch?: GatewayFetch;
  beforePaymentGrant?: () => Promise<void>;
}
export async function buildApp(options: AppOptions = {}) {
  const env: Environment = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseUrl: options.databaseUrl ?? process.env.DATABASE_URL ?? '',
    jwtSecret: options.jwtSecret ?? process.env.JWT_SECRET ?? '',
    allowedOrigins: (
      process.env.ALLOWED_ORIGINS ??
      'http://localhost:5173,http://localhost:5174'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    redisUrl: process.env.REDIS_URL || undefined,
    smtpHost: process.env.SMTP_HOST || undefined,
    smtpPort: Number(process.env.SMTP_PORT ?? 1025),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    mailFrom: process.env.MAIL_FROM ?? 'Fishing World <noreply@example.test>',
    googleClientId: process.env.GOOGLE_CLIENT_ID || undefined,
    smsWebhookUrl: process.env.SMS_WEBHOOK_URL || undefined,
    smsWebhookToken: process.env.SMS_WEBHOOK_TOKEN || undefined,
    otpDevOutbox: process.env.OTP_DEV_OUTBOX === 'true',
    ...options.env,
  };
  assert(env.databaseUrl, 500, 'DATABASE_URL_REQUIRED');
  assert(
    env.jwtSecret.length >= 32 && !env.jwtSecret.startsWith('replace-'),
    500,
    'JWT_SECRET_REQUIRED',
    'Set a random JWT_SECRET of at least 32 characters.',
  );
  if (env.nodeEnv === 'production') {
    assert(env.redisUrl, 500, 'REDIS_REQUIRED');
    assert(!env.otpDevOutbox, 500, 'OTP_DEV_OUTBOX_FORBIDDEN');
    assert(
      !env.smsWebhookUrl || env.smsWebhookUrl.startsWith('https://'),
      500,
      'HTTPS_SMS_WEBHOOK_REQUIRED',
    );
    assert(
      env.allowedOrigins.every((origin) => origin.startsWith('https://')),
      500,
      'HTTPS_ORIGINS_REQUIRED',
    );
    // This MVP intentionally cannot be launched as an unreviewed public Vietnamese game.
    assert(
      process.env.PUBLIC_RELEASE_APPROVED === 'true',
      500,
      'PUBLIC_RELEASE_NOT_APPROVED',
      'Production requires completed legal/security release review.',
    );
  }
  const app = Fastify({
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logger:
      options.logger === false
        ? false
        : {
            level: process.env.LOG_LEVEL ?? 'info',
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers.set-cookie',
              'password',
              'token',
            ],
            serializers: {
              req: (request: {
                method: string;
                url: string;
                hostname: string;
                ip: string;
              }) => ({
                method: request.method,
                url: request.url.split('?')[0],
                hostname: request.hostname,
                remoteAddress: request.ip,
              }),
            },
          },
    bodyLimit: 64 * 1024,
    trustProxy:
      env.nodeEnv === 'production'
        ? (process.env.TRUST_PROXY ?? '127.0.0.1')
        : false,
  });
  const db = createDatabase(env.databaseUrl);
  const now = options.now ?? Date.now;
  const messaging = createMessaging(env, now);
  const ctx: Context = {
    app,
    db,
    env,
    now,
    sendMessage: options.sendMessage ?? messaging.send,
    canSend: options.sendMessage ? () => true : messaging.canSend,
    ready: options.sendMessage ? async () => {} : messaging.ready,
    verifyGoogle:
      options.verifyGoogle ??
      (env.googleClientId ? googleVerifier(env.googleClientId) : undefined),
  };
  const redis = env.redisUrl
    ? new Redis(env.redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      })
    : undefined;
  if (redis) {
    redis.on('error', (error) =>
      app.log.error({ err: error.message }, 'Redis unavailable'),
    );
    await redis.connect();
  } else
    app.log.warn(
      'REDIS_URL absent: development process-local rate limits only; this is not a multi-process production configuration.',
    );
  if (!options.disableRateLimit) {
    const localAccountLimits = new Map<
      string,
      { count: number; expiresAt: number }
    >();
    ctx.limitAuthAccount = async (key, max, windowMs) => {
      let count: number;
      if (redis) {
        try {
          count = Number(
            await redis.eval(
              "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n",
              1,
              `fwo:auth:${key}`,
              windowMs,
            ),
          );
        } catch {
          throw new ApiError(503, 'RATE_LIMITER_UNAVAILABLE');
        }
      } else {
        const previous = localAccountLimits.get(key);
        const value =
          previous && previous.expiresAt > now()
            ? { ...previous, count: previous.count + 1 }
            : { count: 1, expiresAt: now() + windowMs };
        if (localAccountLimits.size >= 10000 && !localAccountLimits.has(key)) {
          const oldest = localAccountLimits.keys().next().value;
          if (oldest) localAccountLimits.delete(oldest);
        }
        localAccountLimits.set(key, value);
        count = value.count;
      }
      assert(
        count <= max,
        429,
        'ACCOUNT_RATE_LIMITED',
        'Có quá nhiều yêu cầu cho tài khoản này. Vui lòng thử lại sau.',
      );
    };
  }
  await app.register(cookie);
  await app.register(cors, {
    credentials: true,
    exposedHeaders: ['X-Fwo-Session-Expired'],
    origin: (origin, callback) =>
      callback(null, !origin || env.allowedOrigins.includes(origin)),
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(jwt, { secret: env.jwtSecret });
  await app.register(swagger, {
    openapi: {
      info: { title: 'Fishing World Online API', version: '0.1.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });
  if (env.nodeEnv !== 'production')
    await app.register(swaggerUi, { routePrefix: '/docs' });
  app.addHook('preHandler', async (request, reply) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers.origin
    )
      assert(
        env.allowedOrigins.includes(request.headers.origin),
        403,
        'ORIGIN_NOT_ALLOWED',
      );
    if (request.routeOptions.config.auth) {
      let verified = false;
      try {
        await request.jwtVerify();
        verified = !request.user.purpose;
      } catch {
        // Only the cast cookie can authorize completion when normal auth expires.
      }
      const user = verified
        ? await db.user.findFirst({
            where: {
              id: request.user.sub,
              status: 'ACTIVE',
              deletedAt: null,
              sessions: {
                some: {
                  familyId: request.user.familyId,
                  revokedAt: null,
                  usedAt: null,
                  expiresAt: { gt: new Date(now()) },
                  absoluteExpiresAt: { gt: new Date(now()) },
                },
              },
            },
            include: { admin: true },
          })
        : null;
      request.principal = user
        ? {
            id: user.id,
            familyId: request.user.familyId,
            role: user.admin?.role ?? 'PLAYER',
          }
        : ((await fishingPrincipal(ctx, request)) ?? undefined);
      assert(request.principal, 401, 'UNAUTHENTICATED');
      const expectedUser = request.headers['x-fwo-user-id'];
      assert(
        expectedUser === undefined || expectedUser === request.principal.id,
        401,
        'SESSION_ACCOUNT_CHANGED',
      );
      if (request.principal.fishingSessionId) {
        const active = await db.user.findFirst({
          where: {
            id: request.principal.id,
            status: 'ACTIVE',
            deletedAt: null,
          },
        });
        assert(active, 401, 'UNAUTHENTICATED');
        reply.header('X-Fwo-Session-Expired', 'true');
      }
      if (request.routeOptions.config.roles)
        assert(
          request.routeOptions.config.roles.includes(request.principal.role),
          403,
          'FORBIDDEN',
        );
    }
  });
  if (!options.disableRateLimit)
    await app.register(rateLimit, {
      hook: 'preHandler',
      max: 600,
      timeWindow: '1 minute',
      redis,
      skipOnError: false,
      keyGenerator: (request) => request.principal?.id ?? request.ip,
    });
  app.setErrorHandler((error, request, reply) => {
    let details: ValidationDetails =
      error instanceof ApiError ? (error.details ?? {}) : {};
    let status = error instanceof ApiError ? error.status : 500;
    let code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
    let message =
      error instanceof ApiError
        ? error.message
        : 'Đã xảy ra lỗi. Vui lòng thử lại.';
    if (error instanceof ZodError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      details = zodValidationDetails(error);
      message = details.fields
        ? 'Vui lòng kiểm tra các trường được đánh dấu.'
        : (details.formErrors?.[0] ?? 'Dữ liệu không hợp lệ.');
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      status = 409;
      code = 'ALREADY_EXISTS';
      message = 'Tên hoặc dữ liệu này đã tồn tại.';
      if (
        [
          '/api/v1/auth/register',
          '/api/v1/auth/register/verify',
          '/api/v1/auth/google',
          '/api/v1/users/me',
        ].includes(request.routeOptions.url ?? '')
      ) {
        const conflict = accountConflictDetails(error.meta);
        if (conflict) {
          code = conflict.code;
          message = conflict.message;
          details = { fields: conflict.fields };
        }
      }
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      status = 404;
      code = 'NOT_FOUND';
    }
    const httpError = error as {
      statusCode?: number;
      code?: string;
      validation?: AjvIssue[];
    };
    if (httpError.statusCode === 429) {
      status = 429;
      code = 'RATE_LIMITED';
      message = 'Thao tác quá nhanh, vui lòng thử lại sau.';
    }
    if (httpError.statusCode === 400 && !(error instanceof ApiError)) {
      status = 400;
      code = 'VALIDATION_ERROR';
      if (httpError.validation) {
        details = ajvValidationDetails(httpError.validation);
        message = details.fields
          ? 'Vui lòng kiểm tra các trường được đánh dấu.'
          : (details.formErrors?.[0] ?? 'Dữ liệu không hợp lệ.');
      }
    }
    if (httpError.statusCode === 413) {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Dữ liệu gửi lên quá lớn.';
    }
    if (httpError.statusCode === 415) {
      status = 415;
      code = 'UNSUPPORTED_MEDIA_TYPE';
      message = 'API yêu cầu dữ liệu JSON.';
    }
    if (status >= 500)
      app.log.error(
        { err: error, requestId: request.id },
        'API request failed',
      );
    return reply
      .code(status)
      .send({ error: { code, message, requestId: request.id, ...details } });
  });
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Không tìm thấy API.',
        requestId: request.id,
      },
    }),
  );
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/'))
      reply.header('Cache-Control', 'no-store');
    return payload;
  });
  installRouteSchemas(app);
  app.get('/health', { schema: { tags: ['Operations'] } }, async () => ({
    status: 'ok',
    service: 'fwo-api',
  }));
  app.get(
    '/ready',
    { schema: { tags: ['Operations'] } },
    async (_request, reply) => {
      try {
        await db.$queryRaw`SELECT 1`;
        if (redis) await redis.ping();
        return {
          status: 'ready',
          rateLimit: redis ? 'redis' : 'local-development',
        };
      } catch {
        return reply.code(503).send({ status: 'not-ready' });
      }
    },
  );
  registerAuth(ctx);
  const outbox = messaging.outbox;
  if (outbox && !options.sendMessage && env.nodeEnv !== 'production')
    // Local/E2E stand-in for an inbox; createMessaging refuses this mode in production.
    app.get(
      '/api/v1/dev/otp-outbox',
      { schema: { hide: true } },
      async (request) => {
        const to = String((request.query as { to?: string }).to ?? '');
        const message = outbox.get(to.trim().toLowerCase()) ?? outbox.get(to);
        assert(message, 404, 'NOT_FOUND');
        return {
          data: {
            code: message.code ?? null,
            text: message.text,
            sentAt: message.sentAt,
          },
        };
      },
    );
  registerPlayers(ctx);
  registerCharacters(ctx);
  registerFashion(ctx);
  registerFashionPasses(ctx);
  registerFishing(ctx);
  registerAdmin(ctx);
  registerAnalytics(ctx);
  const payments = registerPayments(ctx, {
    config: options.paymentConfig,
    fetcher: options.paymentFetch,
    beforeGrant: options.beforePaymentGrant,
    redis,
  });
  app.addHook('onClose', async () => {
    await db.$disconnect();
    if (redis) await redis.quit();
  });
  // BigInt never enters a wire response as a JavaScript number.
  app.addHook('preSerialization', async (_request, _reply, payload) =>
    plain(payload),
  );
  return { app, db, env, payments };
}
