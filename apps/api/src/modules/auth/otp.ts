import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { OtpChallengeDto } from '@fwo/contracts';
import type { Prisma } from '@prisma/client';
import type { Tx } from '../../db.js';
import type { Context, OutboundMessage } from '../../types.js';
import { ApiError } from '../../lib/errors.js';

export const OTP_TTL_MS = 10 * 60_000;
export const OTP_RESEND_MS = 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 5;

type Purpose = 'REGISTER' | 'PROFILE_UPDATE';
type Channel = OutboundMessage['channel'];

/** Thrown inside a transaction when the code is wrong; `guard` records the attempt after rollback. */
class OtpMismatch extends Error {
  constructor(readonly challengeId: string) {
    super('OTP_MISMATCH');
  }
}

const expired = () =>
  new ApiError(
    400,
    'OTP_EXPIRED',
    'Mã xác thực đã hết hạn hoặc đã được dùng. Vui lòng gửi lại mã mới.',
    {
      fields: {
        code: ['Mã đã hết hạn hoặc đã dùng. Vui lòng gửi lại mã mới.'],
      },
    },
  );

export function maskDestination(channel: Channel, destination: string) {
  if (channel === 'SMS')
    return `${destination.slice(0, 3)} ${'•'.repeat(destination.length - 6)}${destination.slice(-3)}`;
  const [name = '', domain = ''] = destination.split('@');
  return `${name.slice(0, Math.min(2, name.length))}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

function message(
  channel: Channel,
  to: string,
  code: string,
  purpose: Purpose,
): OutboundMessage {
  const action =
    purpose === 'REGISTER'
      ? 'hoàn tất đăng ký'
      : 'xác nhận thay đổi hồ sơ';
  return {
    channel,
    to,
    code,
    subject: `Mã xác thực Fishing World: ${code}`,
    text: `${code} là mã ${action} Fishing World, hiệu lực 10 phút. Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên hỗ trợ.`,
  };
}

export function createOtp(ctx: Context) {
  const { db, env, now } = ctx;
  const digest = (challengeId: string, code: string) =>
    createHmac('sha256', env.jwtSecret)
      .update(`otp:${challengeId}:${code}`)
      .digest('hex');
  const newCode = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
  const dto = (row: {
    id: string;
    channel: Channel;
    destination: string;
    expiresAt: Date;
    lastSentAt: Date;
  }): OtpChallengeDto => ({
    challengeId: row.id,
    channel: row.channel,
    destination: maskDestination(row.channel, row.destination),
    expiresAt: row.expiresAt.toISOString(),
    resendAfter: new Date(
      row.lastSentAt.getTime() + OTP_RESEND_MS,
    ).toISOString(),
  });
  const limitDestination = (destination: string) =>
    ctx.limitAuthAccount?.(
      `otp:${createHmac('sha256', env.jwtSecret).update(destination).digest('hex')}`,
      OTP_MAX_SENDS,
      3600_000,
    );

  return {
    /** Sends a code first, then stores only its HMAC; a failed send leaves no challenge behind. */
    async issue(input: {
      userId: string | null;
      purpose: Purpose;
      channel: Channel;
      destination: string;
      payload: Prisma.InputJsonObject;
    }): Promise<OtpChallengeDto> {
      await limitDestination(input.destination);
      const id = randomUUID();
      const code = newCode();
      await ctx.sendMessage(
        message(input.channel, input.destination, code, input.purpose),
      );
      const row = await db.otpChallenge.create({
        data: {
          id,
          userId: input.userId,
          purpose: input.purpose,
          channel: input.channel,
          destination: input.destination,
          codeHash: digest(id, code),
          payload: input.payload,
          lastSentAt: new Date(now()),
          expiresAt: new Date(now() + OTP_TTL_MS),
        },
      });
      return dto(row);
    },

    /** New code for the same challenge; the previous code stops working. */
    async resend(challengeId: string, purpose: Purpose, userId: string | null) {
      const row = await db.otpChallenge.findUnique({
        where: { id: challengeId },
      });
      if (
        !row ||
        row.purpose !== purpose ||
        row.userId !== userId ||
        row.consumedAt
      )
        throw expired();
      if (row.sendCount >= OTP_MAX_SENDS)
        throw new ApiError(
          429,
          'OTP_RESEND_LIMIT',
          'Đã gửi lại quá nhiều lần. Vui lòng bắt đầu lại sau ít phút.',
        );
      if (row.lastSentAt.getTime() + OTP_RESEND_MS > now())
        throw new ApiError(
          429,
          'OTP_RESEND_TOO_SOON',
          'Vui lòng đợi một chút trước khi gửi lại mã.',
        );
      await limitDestination(row.destination);
      const code = newCode();
      await ctx.sendMessage(message(row.channel, row.destination, code, purpose));
      const updated = await db.otpChallenge.update({
        where: { id: row.id, consumedAt: null, sendCount: row.sendCount },
        data: {
          codeHash: digest(row.id, code),
          attempts: 0,
          sendCount: { increment: 1 },
          lastSentAt: new Date(now()),
          expiresAt: new Date(now() + OTP_TTL_MS),
        },
      });
      return dto(updated);
    },

    /**
     * Locks, validates and consumes a challenge inside the caller's transaction, returning
     * the pending payload. Must run inside `guard` so wrong codes are counted after rollback.
     */
    async consume(
      tx: Tx,
      input: {
        challengeId: string;
        code: string;
        purpose: Purpose;
        userId: string | null;
      },
    ) {
      await tx.$queryRaw`SELECT id FROM otp_challenges WHERE id = ${input.challengeId}::uuid FOR UPDATE`;
      const row = await tx.otpChallenge.findUnique({
        where: { id: input.challengeId },
      });
      if (
        !row ||
        row.purpose !== input.purpose ||
        row.userId !== input.userId ||
        row.consumedAt ||
        row.expiresAt.getTime() <= now()
      )
        throw expired();
      if (row.attempts >= OTP_MAX_ATTEMPTS)
        throw new ApiError(
          429,
          'OTP_LOCKED',
          'Nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.',
          { fields: { code: ['Nhập sai quá nhiều lần. Hãy gửi lại mã mới.'] } },
        );
      const expected = Buffer.from(row.codeHash);
      const actual = Buffer.from(digest(row.id, input.code));
      if (
        expected.length !== actual.length ||
        !timingSafeEqual(expected, actual)
      )
        throw new OtpMismatch(row.id);
      await tx.otpChallenge.update({
        where: { id: row.id },
        data: { consumedAt: new Date(now()), payload: {} },
      });
      return row;
    },

    async guard<T>(action: () => Promise<T>): Promise<T> {
      try {
        return await action();
      } catch (error) {
        if (!(error instanceof OtpMismatch)) throw error;
        const updated = await db.otpChallenge.update({
          where: { id: error.challengeId },
          data: { attempts: { increment: 1 } },
          select: { attempts: true },
        });
        const remaining = Math.max(0, OTP_MAX_ATTEMPTS - updated.attempts);
        const text =
          remaining > 0
            ? `Mã xác thực chưa đúng. Còn ${remaining} lần thử.`
            : 'Nhập sai quá nhiều lần. Hãy gửi lại mã mới.';
        throw new ApiError(400, 'OTP_INVALID', text, {
          fields: { code: [text] },
        });
      }
    },
  };
}
export type OtpService = ReturnType<typeof createOtp>;
