import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import * as c from '@fwo/contracts';
import { gameConfigSchema } from '@fwo/game-config';
import { patchSchemas } from '../modules/admin/index.js';
import { forgotSchema, resetSchema } from '../modules/auth/index.js';

const object = (fields: Record<string, z.ZodType>) => z.strictObject(fields);
const envelope = (data: z.ZodType) => object({ data });
const list = (item: z.ZodType) => object({ items: z.array(item) });
const generic = z.record(z.string(), z.unknown());
const reason = z.string().min(5).max(1000);
const empty = object({});
const authResult = object({
  user: object({
    id: c.uuidSchema,
    email: z.email().nullable(),
    phone: z.string().nullable(),
  }),
  profile: c.playerSchema,
  accessToken: z.string(),
  expiresIn: z.number().int(),
});
const otpChallenge = object({
  challengeId: c.uuidSchema,
  channel: z.enum(['EMAIL', 'SMS']),
  destination: z.string(),
  expiresAt: z.iso.datetime(),
  resendAfter: z.iso.datetime(),
});
const refreshResult = object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
});
const inventoryAndPlayer = object({
  inventory: c.inventorySchema,
  player: c.playerSchema,
});
const jsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, {
    target: 'draft-7',
    io: 'input',
    unrepresentable: 'any',
  });

/** One executable contract per route; service-level Zod retains refinements and transforms. */
export function installRouteSchemas(app: FastifyInstance) {
  const bodies: Record<string, z.ZodType> = {
    'POST /auth/register': c.registerSchema,
    'POST /auth/register/verify': c.otpVerifySchema,
    'POST /auth/otp/resend': c.otpResendSchema,
    'POST /auth/google': c.googleAuthSchema,
    'POST /auth/login': c.loginSchema,
    'POST /auth/forgot-password': forgotSchema,
    'POST /auth/reset-password': resetSchema,
    'POST /users/me/profile-otp': c.updateProfileSchema,
    'PATCH /users/me': c.otpVerifySchema,
    'PUT /characters/me': c.characterSaveSchema,
    'POST /fashion/collections/order': c.fashionCollectionOrderSchema,
    'POST /shop/cosmetics/orders': c.cosmeticOrderSchema,
    'POST /characters/presence': c.presenceJoinSchema,
    'PATCH /characters/presence': c.presenceMoveSchema,
    'DELETE /characters/presence': c.presenceLeaveSchema,
    'POST /inventory/equip': c.equipSchema,
    'POST /inventory/unequip': c.unequipSchema,
    'POST /inventory/upgrade': c.upgradeSchema,
    'POST /inventory/use': c.useItemSchema,
    'POST /inventory/rescue': empty,
    'POST /shop/orders': c.shopOrderSchema,
    'POST /shop/sales': c.shopSaleSchema,
    'POST /payments/orders': c.paymentOrderInputSchema,
    'POST /payments/orders/:id/checkout': empty,
    'POST /payments/orders/:id/check': empty,
    'POST /admin/payments/products': c.paymentProductInputSchema,
    'PATCH /admin/payments/products/:id': c.paymentProductInputSchema,
    'POST /admin/payments/orders/:id/reconcile': object({ reason }),
    'POST /missions/:id/claim': c.missionClaimSchema,
    'POST /fishing/sessions': c.createSessionSchema,
    'POST /fishing/locations/:id/messages': c.lakeMessageInputSchema,
    ...Object.fromEntries(
      ['cast', 'hook', 'reel', 'complete', 'abandon'].map((action) => [
        `POST /fishing/sessions/:id/${action}`,
        action === 'cast'
          ? c.castSchema
          : action === 'reel'
            ? c.reelSchema
            : c.completeSchema,
      ]),
    ),
    'PATCH /admin/users/:id/status': object({
      status: z.enum(['ACTIVE', 'SUSPENDED']),
      reason,
    }),
    'PATCH /admin/users/:id/role': object({
      role: z.enum(c.roles),
      password: c.passwordSchema,
      reason,
    }),
    'POST /admin/users/:id/revoke-sessions': object({ reason }),
    'POST /admin/configs/:key/versions': object({
      value: gameConfigSchema,
      schemaVersion: z.literal(1),
      reason,
    }),
    'POST /admin/configs/:key/versions/:version/publish': object({
      expectedActiveVersion: z.number().int().positive(),
      reason,
    }),
    'POST /analytics/events': object({
      events: z
        .array(
          object({
            eventId: c.uuidSchema,
            name: z.enum([
              'tutorial_started',
              'tutorial_completed',
              'daily_login',
              'page_view',
              'session_started',
              'session_ended',
            ]),
            occurredAt: z.iso.datetime(),
            properties: z
              .record(
                z.string(),
                z.union([z.string().max(100), z.number(), z.boolean()]),
              )
              .optional(),
          }),
        )
        .min(1)
        .max(20),
    }),
  };
  for (const [resource, schema] of Object.entries(patchSchemas)) {
    bodies[`PATCH /admin/${resource}/:id`] = schema;
    bodies[`POST /admin/${resource}`] = object({
      item: generic,
      reason,
      ...(resource === 'fish'
        ? { photoUpload: c.fishPhotoUploadSchema.optional() }
        : {}),
    });
  }
  const results: Record<string, z.ZodType> = {
    'POST /auth/register': otpChallenge,
    'POST /auth/register/verify': authResult,
    'POST /auth/otp/resend': otpChallenge,
    'POST /auth/google': authResult,
    'GET /auth/providers': object({
      email: z.boolean(),
      phone: z.boolean(),
      google: object({ clientId: z.string() }).nullable(),
    }),
    'POST /users/me/profile-otp': otpChallenge,
    'POST /auth/login': authResult,
    'POST /auth/refresh': refreshResult,
    'GET /auth/fishing-resume': c.playerSchema,
    'POST /auth/forgot-password': object({ message: z.string() }),
    'GET /users/me': c.playerSchema,
    'PATCH /users/me': c.playerSchema,
    'GET /fish': list(c.fishSchema),
    'GET /locations': list(c.locationSchema),
    'GET /locations/:id': c.locationSchema.extend({
      fish: z.array(c.fishSchema),
    }),
    'GET /characters/me': c.characterSchema.nullable(),
    'PUT /characters/me': c.characterSchema,
    'GET /characters/catalog': c.characterCatalogSchema,
    'GET /locations/:id/characters': c.lakePresenceSchema,
    'GET /inventory': c.inventorySchema,
    'GET /payments/catalog': c.paymentCatalogSchema,
    'POST /payments/orders': c.paymentOrderSchema,
    'GET /payments/orders/:id': c.paymentOrderSchema,
    'POST /payments/orders/:id/checkout': c.paymentOrderSchema,
    'POST /payments/orders/:id/check': c.paymentOrderSchema,
    'GET /payments/orders': object({
      items: z.array(c.paymentOrderSchema),
      nextCursor: c.uuidSchema.nullable(),
    }),
    'GET /admin/payments/orders': object({
      items: z.array(c.paymentOrderSchema.extend({ userId: c.uuidSchema })),
      nextCursor: c.uuidSchema.nullable(),
    }),
    'GET /admin/payments/orders/:id': c.paymentAdminDetailSchema,
    'POST /inventory/equip': c.inventorySchema,
    'POST /inventory/unequip': c.inventorySchema,
    'POST /inventory/upgrade': inventoryAndPlayer,
    'POST /inventory/rescue': inventoryAndPlayer,
    'GET /wallet': object({ balanceGold: c.moneySchema }),
    'GET /shop': object({
      configVersion: z.number().int(),
      items: z.array(c.shopItemSchema),
    }),
    'POST /shop/orders': object({
      orderId: c.uuidSchema,
      player: c.playerSchema,
      inventory: c.inventorySchema,
    }),
    'POST /shop/sales': object({
      saleId: c.uuidSchema,
      totalGold: c.moneySchema,
      player: c.playerSchema,
      inventory: c.inventorySchema,
    }),
    'GET /collection': list(c.collectionItemSchema),
    'GET /missions': object({
      periodKey: z.string(),
      resetAt: z.iso.datetime(),
      items: z.array(c.missionSchema),
    }),
    'POST /missions/:id/claim': object({ player: c.playerSchema }),
    'GET /leaderboard': object({
      items: z.array(c.leaderboardEntrySchema),
      myRank: z.number().int().optional(),
    }),
    'GET /fishing/sessions/active': c.sessionSchema.nullable(),
    'GET /fishing/locations/:id/community': c.lakeCommunitySchema,
    'GET /fishing/locations/:id/conditions': c.waterConditionsSchema,
    'POST /fishing/locations/:id/messages': c.lakeMessageSchema,
  };
  const error = jsonSchema(
    object({
      error: c.apiErrorSchema,
    }),
  );
  app.addHook('onRoute', (route) => {
    if (!route.url.startsWith('/api/v1/')) return;
    const method = Array.isArray(route.method)
      ? route.method[0]!
      : route.method;
    const path = route.url.slice('/api/v1'.length);
    const key = `${method} ${path}`;
    // Modules reuse route option objects; never attach another route's body to them.
    const schema = (route.schema = { ...route.schema });
    schema.operationId ??= `${method.toLowerCase()}_${path.replaceAll(/[^a-zA-Z0-9]+/g, '_')}`;
    schema.security ??= route.config?.auth ? [{ bearerAuth: [] }] : [];
    const params = [...path.matchAll(/:([a-zA-Z]+)/g)].map(
      (match) => match[1]!,
    );
    if (params.length)
      schema.params = jsonSchema(
        object(
          Object.fromEntries(
            params.map((name) => [
              name,
              name === 'id'
                ? c.uuidSchema
                : name === 'key'
                  ? z.literal('game')
                  : z.string().regex(/^[1-9]\d*$/),
            ]),
          ),
        ),
      );
    if (bodies[key]) schema.body = jsonSchema(bodies[key]);
    if (path === '/leaderboard')
      schema.querystring = jsonSchema(c.leaderboardQuerySchema);
    if (key === 'GET /shop') schema.querystring = jsonSchema(c.shopQuerySchema);
    if (path === '/wallet/transactions')
      schema.querystring = {
        type: 'object',
        additionalProperties: false,
        properties: {
          cursor: { type: 'string', format: 'uuid' },
          limit: { type: 'string', pattern: '^(?:[1-9]|[1-9][0-9]|100)$' },
        },
      };
    const economic =
      !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
      route.config?.auth &&
      path !== '/analytics/events' &&
      path !== '/characters/presence' &&
      !path.includes('/users/me/sessions/');
    if (economic)
      schema.headers = {
        type: 'object',
        required: ['idempotency-key'],
        properties: { 'idempotency-key': { type: 'string', format: 'uuid' } },
      };
    const sessionResult =
      path.startsWith('/fishing/sessions') && !path.endsWith('/active')
        ? c.sessionSchema
        : undefined;
    schema.response ??= {
      '2xx': jsonSchema(envelope(results[key] ?? sessionResult ?? z.unknown())),
      ...Object.fromEntries(
        [400, 401, 403, 404, 409, 422, 429, 500, 503].map((status) => [
          status,
          error,
        ]),
      ),
    };
  });
}
