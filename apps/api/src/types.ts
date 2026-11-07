import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Database } from './db.js';

export interface Environment {
  nodeEnv: string;
  jwtSecret: string;
  databaseUrl: string;
  allowedOrigins: string[];
  webOrigin: string;
  redisUrl?: string;
  smtpHost?: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPassword?: string;
  mailFrom: string;
  /** Google Identity Services OAuth client id; Google sign-in is disabled when absent. */
  googleClientId?: string;
  /** HTTPS gateway receiving `{ to, message }` for SMS OTP; phone sign-up is disabled when absent. */
  smsWebhookUrl?: string;
  smsWebhookToken?: string;
  /** Non-production only: keep OTP messages in memory for local/E2E testing instead of sending. */
  otpDevOutbox: boolean;
}
export interface OutboundMessage {
  channel: 'EMAIL' | 'SMS';
  to: string;
  subject: string;
  text: string;
  /** Present for OTP messages so the dev outbox can expose the code. */
  code?: string;
}
export type MessageSender = (message: OutboundMessage) => Promise<void>;
export interface GoogleIdentity {
  subject: string;
  email: string;
}
export interface Context {
  app: FastifyInstance;
  db: Database;
  env: Environment;
  now: () => number;
  sendMessage: MessageSender;
  /** Whether a channel can deliver right now (configured provider or dev outbox). */
  canSend: (channel: OutboundMessage['channel']) => boolean;
  ready: (channel: OutboundMessage['channel']) => Promise<void>;
  verifyGoogle?: (credential: string) => Promise<GoogleIdentity>;
  limitAuthAccount?: (
    key: string,
    max: number,
    windowMs: number,
  ) => Promise<void>;
}
export interface Principal {
  id: string;
  familyId: string;
  role: string;
  fishingSessionId?: string;
  fishingAccessExpiresAt?: number;
}
declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal;
  }
}
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      familyId: string;
      purpose?: 'finish-fishing';
      sessionId?: string;
      exp?: number;
    };
    user: { sub: string; familyId: string; purpose?: 'finish-fishing' };
  }
}
export function principal(request: FastifyRequest): Principal {
  if (!request.principal)
    throw new Error('Protected route missing authentication');
  return request.principal;
}
