import { WebSocketServer, WebSocket } from 'ws';
import type { Redis } from 'ioredis';
import type { PaymentEvent } from '@fwo/contracts';
import { paymentEventSchema } from '@fwo/contracts';
import { z } from 'zod';
import type { Context } from '../../types.js';

interface Connection {
  socket: WebSocket;
  userId: string;
  familyId: string;
  expiresAt: number;
}
const channel = 'fwo:payments:notifications:v1';
/** Authentication travels in the first frame, never a query string, cookie or URL log. */
export class RealtimeNotificationService {
  private server = new WebSocketServer({
    noServer: true,
    maxPayload: 4096,
    perMessageDeflate: false,
  });
  private connections = new Set<Connection>();
  private subscriber?: Redis;
  private heartbeat?: ReturnType<typeof setInterval>;
  private pending = new Set<WebSocket>();
  private upgradeCounts = new Map<string, { count: number; until: number }>();
  constructor(
    private ctx: Context,
    private redis?: Redis,
  ) {
    ctx.app.server.on('upgrade', (request, socket, head) => {
      if (
        request.url !== '/api/v1/payments/socket' ||
        !request.headers.origin ||
        !ctx.env.allowedOrigins.includes(request.headers.origin)
      ) {
        socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        return;
      }
      const ip = request.socket.remoteAddress ?? 'unknown';
      const previous = this.upgradeCounts.get(ip);
      const counter =
        previous && previous.until > ctx.now()
          ? previous
          : { count: 0, until: ctx.now() + 60000 };
      counter.count++;
      if (this.upgradeCounts.size > 10000) this.upgradeCounts.clear();
      this.upgradeCounts.set(ip, counter);
      if (
        counter.count > 60 ||
        this.pending.size + this.connections.size >= 1000
      ) {
        socket.end(
          'HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n',
        );
        return;
      }
      this.server.handleUpgrade(request, socket, head, (ws) =>
        this.authenticate(ws),
      );
    });
  }
  private authenticate(socket: WebSocket) {
    this.pending.add(socket);
    const timeout = setTimeout(
      () => socket.close(1008, 'Authentication required'),
      5000,
    );
    let used = false;
    let lastPingAt = 0;
    let connection: Connection | undefined;
    socket.on('error', () => {});
    socket.on('close', () => {
      clearTimeout(timeout);
      this.pending.delete(socket);
      if (connection) this.connections.delete(connection);
    });
    socket.on('message', async (raw) => {
      if (used && connection) {
        if (raw.toString() === '{"event":"payment:ping"}') {
          if (this.ctx.now() - lastPingAt < 5000) {
            socket.close(1008, 'Rate limited');
            return;
          }
          lastPingAt = this.ctx.now();
          socket.send(JSON.stringify({ event: 'payment:pong' }));
          return;
        }
      }
      if (used) {
        socket.close(1008, 'Unexpected message');
        return;
      }
      used = true;
      try {
        const { accessToken } = z
          .strictObject({ accessToken: z.string().max(3000) })
          .parse(JSON.parse(raw.toString()));
        const claims = this.ctx.app.jwt.verify<{
          sub: string;
          familyId: string;
          exp: number;
          purpose?: string;
        }>(accessToken);
        const candidate = {
          socket,
          userId: claims.sub,
          familyId: claims.familyId,
          expiresAt: claims.exp * 1000,
        };
        if (
          claims.purpose ||
          !(await this.active(candidate)) ||
          [...this.connections].filter((c) => c.userId === claims.sub).length >=
            5 ||
          socket.readyState !== WebSocket.OPEN
        )
          throw new Error('Unauthorized');
        connection = candidate;
        clearTimeout(timeout);
        this.pending.delete(socket);
        this.connections.add(candidate);
        socket.send(JSON.stringify({ event: 'payment:connected' }));
      } catch {
        socket.close(1008, 'Unauthorized');
      }
    });
  }
  private async active(connection: Connection) {
    if (connection.expiresAt <= this.ctx.now()) return false;
    return !!(await this.ctx.db.user.findFirst({
      where: {
        id: connection.userId,
        status: 'ACTIVE',
        deletedAt: null,
        sessions: {
          some: {
            familyId: connection.familyId,
            usedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date(this.ctx.now()) },
            absoluteExpiresAt: { gt: new Date(this.ctx.now()) },
          },
        },
      },
      select: { id: true },
    }));
  }
  private async broadcast(userId: string, payload: PaymentEvent) {
    await Promise.all(
      [...this.connections]
        .filter((c) => c.userId === userId)
        .map(async (connection) => {
          try {
            if (!(await this.active(connection))) {
              connection.socket.close(1008, 'Session expired');
              return;
            }
            if (connection.socket.readyState === WebSocket.OPEN) {
              if (connection.socket.bufferedAmount > 65536) {
                connection.socket.close(1013, 'Reconnect to synchronize');
                return;
              }
              connection.socket.send(JSON.stringify(payload));
            }
          } catch {
            connection.socket.close(1011, 'Reconnect to synchronize');
          }
        }),
    );
  }
  async start() {
    if (this.redis) {
      this.subscriber = this.redis.duplicate({ lazyConnect: true });
      this.subscriber.on('error', () =>
        this.ctx.app.log.warn('Payment notification subscription unavailable'),
      );
      await this.subscriber.connect();
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (_channel, message) => {
        try {
          const envelope = z
            .object({ userId: z.uuid(), payload: paymentEventSchema })
            .parse(JSON.parse(message));
          void this.broadcast(envelope.userId, envelope.payload);
        } catch {
          this.ctx.app.log.warn('Invalid internal payment notification');
        }
      });
    }
    this.heartbeat = setInterval(() => {
      for (const connection of this.connections) {
        void this.active(connection)
          .then((active) => {
            if (!active) connection.socket.close(1008, 'Session expired');
            else connection.socket.ping();
          })
          .catch(() => connection.socket.close(1011));
      }
    }, 15000);
    this.heartbeat.unref();
  }
  async publish(userId: string, payload: PaymentEvent) {
    if (this.redis)
      await this.redis.publish(channel, JSON.stringify({ userId, payload }));
    else await this.broadcast(userId, payload);
  }
  async close() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const socket of this.pending) socket.terminate();
    for (const { socket } of this.connections) socket.terminate();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
  }
}
