import { describe, expect, it } from 'vitest';
import {
  castSchema,
  registerSchema,
  reelSchema,
  shopOrderSchema,
  resetPasswordSchema,
  loginSchema,
  phoneSchema,
  updateProfileSchema,
  otpVerifySchema,
} from './index.js';

describe('strict API trust boundary', () => {
  it('rejects client supplied rewards and out of range gameplay inputs', () => {
    expect(
      castSchema.safeParse({
        expectedVersion: 0,
        aim: 0.5,
        power: 0.7,
        rewardGold: '99999',
      }).success,
    ).toBe(false);
    expect(
      castSchema.safeParse({ expectedVersion: 0, aim: 2, power: 0.7 }).success,
    ).toBe(false);
    expect(
      reelSchema.safeParse({
        expectedVersion: 1,
        action: 'hold',
        progress: 100,
      }).success,
    ).toBe(false);
  });
  it('requires consent, accepts eight-character passwords and normalizes email', () => {
    const input = {
      email: 'ANGLER@EXAMPLE.COM',
      username: 'Người câu cá',
      password: '12345678',
      acceptTerms: true,
    };
    expect(registerSchema.parse(input).email).toBe('angler@example.com');
    expect(
      registerSchema.safeParse({ ...input, acceptTerms: false }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...input, password: '1234567' }).success,
    ).toBe(false);
    const reset = { token: 'a'.repeat(32), password: '12345678' };
    expect(resetPasswordSchema.safeParse(reset).success).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ ...reset, password: '1234567' }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: input.email, password: '12345678' })
        .success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: input.email, password: '1234567' })
        .success,
    ).toBe(false);
  });
  it('rejects negative/decimal prices and unbounded order quantity', () => {
    const input = {
      shopItemId: '00000000-0000-4000-8000-000000000501',
      quantity: 1,
      expectedUnitPriceGold: '180',
      configVersion: 1,
    };
    expect(shopOrderSchema.safeParse(input).success).toBe(true);
    for (const value of ['-1', '1.5', '01', '1e5'])
      expect(
        shopOrderSchema.safeParse({ ...input, expectedUnitPriceGold: value })
          .success,
      ).toBe(false);
    expect(
      shopOrderSchema.safeParse({ ...input, quantity: 10001 }).success,
    ).toBe(false);
  });
  it('normalizes Vietnamese phones, requires one sign-up channel and keeps email immutable', () => {
    expect(phoneSchema.parse('091 234 5678')).toBe('+84912345678');
    expect(phoneSchema.parse('+84 912.345.678')).toBe('+84912345678');
    expect(phoneSchema.safeParse('0212345678').success).toBe(false);
    expect(phoneSchema.safeParse('09123456').success).toBe(false);
    const base = {
      username: 'Cần thủ',
      password: '12345678',
      acceptTerms: true,
    };
    expect(
      registerSchema.parse({ ...base, channel: 'phone', phone: '0912345678' })
        .phone,
    ).toBe('+84912345678');
    const missing = registerSchema.safeParse({ ...base, channel: 'phone' });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.path).toEqual(['phone']);
    expect(
      registerSchema.safeParse({
        ...base,
        channel: 'email',
        email: 'a@example.com',
        phone: '0912345678',
      }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ phone: '0912345678', password: '12345678' })
        .success,
    ).toBe(true);
    expect(loginSchema.safeParse({ password: '12345678' }).success).toBe(false);
    expect(
      updateProfileSchema.safeParse({ email: 'new@example.com' }).success,
    ).toBe(false);
    expect(
      updateProfileSchema.safeParse({ username: 'Tên mới', phone: '0912345678' })
        .success,
    ).toBe(false);
    expect(
      otpVerifySchema.safeParse({
        challengeId: '00000000-0000-4000-8000-000000000000',
        code: '12345',
      }).success,
    ).toBe(false);
  });
});
