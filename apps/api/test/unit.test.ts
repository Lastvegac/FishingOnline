import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { bootstrapAdminEnvSchema } from '../src/lib/bootstrap-config.js';
import { utcOffsetMinutes } from '../src/lib/time-zone.js';
import {
  zodValidationDetails,
  accountConflictDetails,
} from '../src/lib/validation-errors.js';

const opened: FastifyInstance[] = [];
afterEach(async () => {
  await Promise.all(opened.splice(0).map((app) => app.close()));
});
const options = {
  databaseUrl: 'postgresql://unreachable@127.0.0.1:1/no_database',
  jwtSecret: 'unit-test-secret-at-least-thirty-two-characters',
  logger: false,
  disableRateLimit: true,
  env: { nodeEnv: 'test', redisUrl: undefined },
};
describe('HTTP boundary independent of PostgreSQL', () => {
  it('compiles all executable OpenAPI schemas and serves liveness without a DB', async () => {
    const { app } = await buildApp(options);
    opened.push(app);
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
    expect(app.swagger().paths?.['/api/v1/auth/register']).toBeDefined();
  });
  it('rejects cross-origin mutation before authentication or database work', async () => {
    const { app } = await buildApp(options);
    opened.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: {
        email: 'tester@example.test',
        password: 'test-password-strong',
      },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ORIGIN_NOT_ALLOWED');
  });
  it('rejects malformed and unknown auth fields before any business operation', async () => {
    const { app } = await buildApp(options);
    opened.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'tester@example.test',
        username: 'tester',
        password: 'test-password-strong',
        acceptTerms: true,
        role: 'SUPER_ADMIN',
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('requires a strong secret and completed release gates for production', async () => {
    await expect(
      buildApp({ ...options, jwtSecret: 'weak' }),
    ).rejects.toMatchObject({ code: 'JWT_SECRET_REQUIRED' });
    await expect(
      buildApp({
        ...options,
        env: { nodeEnv: 'production', redisUrl: undefined },
      }),
    ).rejects.toMatchObject({ code: 'REDIS_REQUIRED' });
  });
  it('returns a localized field error for seven-character registration/reset passwords', async () => {
    const { app } = await buildApp(options);
    opened.push(app);
    const cases = [
      {
        url: '/api/v1/auth/register',
        payload: {
          email: 'tester@example.test',
          username: 'tester',
          password: '1234567',
          acceptTerms: true,
        },
      },
      {
        url: '/api/v1/auth/login',
        payload: { email: 'tester@example.test', password: '1234567' },
      },
      {
        url: '/api/v1/auth/reset-password',
        payload: { token: 'a'.repeat(32), password: '1234567' },
      },
    ];
    for (const testCase of cases) {
      const response = await app.inject({ method: 'POST', ...testCase });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.fields.password).toEqual([
        'Mật khẩu cần ít nhất 8 ký tự.',
      ]);
    }
  });
  it('keeps structured Zod field errors and cross-field errors without echoing input values', () => {
    const result = z
      .strictObject({
        email: z.email(),
        password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.'),
      })
      .safeParse({ email: 'private-invalid-email', password: '1234567' });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected invalid fixture');
    const details = zodValidationDetails(result.error);
    expect(details.fields?.email).toEqual(['Email không hợp lệ.']);
    expect(details.fields?.password).toEqual(['Mật khẩu cần ít nhất 8 ký tự.']);
    expect(JSON.stringify(details)).not.toContain('private-invalid-email');
    const form = z
      .object({})
      .refine(() => false, 'Biểu mẫu chưa hợp lệ.')
      .safeParse({});
    if (form.success) throw new Error('Expected invalid form');
    expect(zodValidationDetails(form.error).formErrors).toEqual([
      'Biểu mẫu chưa hợp lệ.',
    ]);
  });
  it('shares the eight-character policy with bootstrap and maps only known account uniqueness constraints', () => {
    const input = {
      DATABASE_URL: 'postgresql://example.test/db',
      ADMIN_EMAIL: 'admin@example.test',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: '12345678',
    };
    expect(bootstrapAdminEnvSchema.safeParse(input).success).toBe(true);
    expect(
      bootstrapAdminEnvSchema.safeParse({ ...input, ADMIN_PASSWORD: '1234567' })
        .success,
    ).toBe(false);
    expect(
      accountConflictDetails(['email_normalized'])?.fields.email,
    ).toBeDefined();
    expect(
      accountConflictDetails(['normalized_username'])?.fields.username,
    ).toBeDefined();
    expect(accountConflictDetails(['slug'])).toBeUndefined();
  });
  it('preserves body-size rejection and the standard error envelope', async () => {
    const { app } = await buildApp(options);
    opened.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'tester@example.test', password: 'x'.repeat(70_000) },
    });
    expect(response.statusCode).toBe(413);
    expect(response.json().error.code).toBe('PAYLOAD_TOO_LARGE');
    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/no-such-endpoint',
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('NOT_FOUND');
  });
});

describe('player local time zone', () => {
  it('resolves IANA offsets including daylight saving and falls back to Vietnam', () => {
    const winter = Date.UTC(2026, 0, 15, 12);
    const summer = Date.UTC(2026, 6, 15, 12);
    expect(utcOffsetMinutes('Asia/Ho_Chi_Minh', winter)).toBe(420);
    expect(utcOffsetMinutes('America/New_York', winter)).toBe(-300);
    expect(utcOffsetMinutes('America/New_York', summer)).toBe(-240);
    expect(utcOffsetMinutes('Asia/Kolkata', summer)).toBe(330);
    expect(utcOffsetMinutes('UTC', summer)).toBe(0);
    expect(utcOffsetMinutes(undefined, summer)).toBe(420);
  });
});
