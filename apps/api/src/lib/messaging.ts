import nodemailer from 'nodemailer';
import type { Environment, MessageSender, OutboundMessage } from '../types.js';
import { ApiError } from './errors.js';

export interface Messaging {
  send: MessageSender;
  canSend: (channel: OutboundMessage['channel']) => boolean;
  /** Probes the provider for every request, so outages do not reveal whether an account exists. */
  ready: (channel: OutboundMessage['channel']) => Promise<void>;
  /** Latest dev-outbox message per destination; undefined outside the dev outbox. */
  outbox?: Map<string, OutboundMessage & { sentAt: number }>;
}

/**
 * Email goes through SMTP and SMS through a provider-agnostic HTTPS webhook, so a
 * Vietnamese brandname SMS gateway can be plugged in without code changes.
 * In non-production with OTP_DEV_OUTBOX=true, messages stay in memory instead.
 */
export function createMessaging(env: Environment, now: () => number): Messaging {
  if (env.otpDevOutbox && env.nodeEnv === 'production')
    throw new Error('OTP_DEV_OUTBOX must not be enabled in production');
  if (env.otpDevOutbox) {
    const outbox = new Map<string, OutboundMessage & { sentAt: number }>();
    return {
      outbox,
      canSend: () => true,
      ready: async () => {},
      async send(message) {
        if (outbox.size >= 1000 && !outbox.has(message.to)) {
          const oldest = outbox.keys().next().value;
          if (oldest) outbox.delete(oldest);
        }
        outbox.set(message.to, { ...message, sentAt: now() });
      },
    };
  }
  const canSend = (channel: OutboundMessage['channel']) =>
    channel === 'EMAIL' ? Boolean(env.smtpHost) : Boolean(env.smsWebhookUrl);
  const unavailable = (channel: OutboundMessage['channel']) =>
    channel === 'EMAIL'
      ? new ApiError(
          503,
          'EMAIL_UNAVAILABLE',
          'Dịch vụ gửi email chưa được cấu hình.',
        )
      : new ApiError(
          503,
          'SMS_UNAVAILABLE',
          'Dịch vụ gửi SMS chưa được cấu hình.',
        );
  const transport = () =>
    nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser
        ? { user: env.smtpUser, pass: env.smtpPassword }
        : undefined,
      connectionTimeout: 5000,
      socketTimeout: 5000,
    });
  return {
    canSend,
    async ready(channel) {
      if (!canSend(channel)) throw unavailable(channel);
      if (channel === 'EMAIL')
        try {
          await transport().verify();
        } catch {
          throw new ApiError(503, 'EMAIL_UNAVAILABLE');
        }
    },
    async send(message) {
      if (!canSend(message.channel)) throw unavailable(message.channel);
      if (message.channel === 'EMAIL') {
        try {
          await transport().sendMail({
            from: env.mailFrom,
            to: message.to,
            subject: message.subject,
            text: message.text,
          });
        } catch {
          throw new ApiError(
            503,
            'EMAIL_UNAVAILABLE',
            'Chưa gửi được email. Vui lòng thử lại sau.',
          );
        }
        return;
      }
      try {
        const response = await fetch(env.smsWebhookUrl!, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(env.smsWebhookToken
              ? { authorization: `Bearer ${env.smsWebhookToken}` }
              : {}),
          },
          body: JSON.stringify({ to: message.to, message: message.text }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(String(response.status));
      } catch {
        throw new ApiError(
          503,
          'SMS_UNAVAILABLE',
          'Chưa gửi được SMS. Vui lòng thử lại sau.',
        );
      }
    },
  };
}
