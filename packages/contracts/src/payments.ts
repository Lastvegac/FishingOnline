import { z } from 'zod';

export const paymentMethods = [
  'MOMO',
  'VNPAY',
  'ATM',
  'INTERNATIONAL_CARD',
] as const;
export const paymentMethodSchema = z.enum(paymentMethods);
export const paymentOrderStatuses = [
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;
export const paymentOrderStatusSchema = z.enum(paymentOrderStatuses);
export const paymentOrderInputSchema = z.strictObject({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(100),
  method: paymentMethodSchema,
});
export const paymentProductInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  amountVnd: z.string().regex(/^[1-9]\d{3,8}$/),
  active: z.boolean(),
  items: z
    .array(
      z.strictObject({
        itemId: z.uuid(),
        kind: z.enum(['BAIT', 'ROD', 'LINE', 'HOOK', 'DIAMOND']),
        quantity: z.number().int().min(1).max(10000),
      }),
    )
    .min(1)
    .max(20)
    .superRefine((items, ctx) => {
      if (new Set(items.map((i) => i.itemId)).size !== items.length)
        ctx.addIssue({
          code: 'custom',
          message: 'Mỗi vật phẩm chỉ xuất hiện một lần.',
        });
      if (items.some((i) => !['BAIT','DIAMOND'].includes(i.kind) && i.quantity !== 1))
        ctx.addIssue({
          code: 'custom',
          message: 'Mỗi trang bị có số lượng 1.',
        });
    }),
  expectedVersion: z.number().int().positive().optional(),
  reason: z.string().trim().min(5).max(1000),
});
export const paymentItemSchema = z.strictObject({
  id: z.uuid(),
  itemId: z.uuid(),
  name: z.string(),
  kind: z.enum(['BAIT', 'ROD', 'LINE', 'HOOK', 'DIAMOND']),
  quantity: z.number().int(),
  imageKey: z.string(),
  inventoryId: z.uuid().nullable(),
});
export const paymentOrderSchema = z.strictObject({
  id: z.uuid(),
  orderCode: z.string(),
  productId: z.uuid(),
  productName: z.string(),
  totalAmount: z.string().regex(/^\d+$/),
  currency: z.literal('VND'),
  quantity: z.number().int(),
  status: paymentOrderStatusSchema,
  method: paymentMethodSchema,
  gateway: z.enum(['MOMO', 'VNPAY']),
  transactionId: z.uuid(),
  paymentStatus: z.enum([
    'PENDING',
    'PROCESSING',
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'EXPIRED',
  ]),
  paymentUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  paidAt: z.iso.datetime().nullable(),
  items: z.array(paymentItemSchema),
});
export const paymentProductSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  amountVnd: z.string(),
  version: z.number().int(),
  maxQuantity: z.number().int(),
  items: z.array(
    z.strictObject({
      itemId: z.uuid(),
      name: z.string(),
      kind: z.enum(['BAIT', 'ROD', 'LINE', 'HOOK', 'DIAMOND']),
      quantity: z.number().int(),
      imageKey: z.string(),
    }),
  ),
});
export const paymentCatalogSchema = z.strictObject({
  environment: z.enum(['disabled', 'sandbox', 'production']),
  methods: z.array(paymentMethodSchema),
  items: z.array(paymentProductSchema),
});
export const paymentEventSchema = z.strictObject({
  id: z.uuid(),
  event: z.enum([
    'payment:pending',
    'payment:processing',
    'payment:success',
    'payment:failed',
    'payment:expired',
  ]),
  data: paymentOrderSchema,
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentOrderDto = z.infer<typeof paymentOrderSchema>;
export type PaymentProductDto = z.infer<typeof paymentProductSchema>;
export type PaymentCatalogDto = z.infer<typeof paymentCatalogSchema>;
export type PaymentEvent = z.infer<typeof paymentEventSchema>;
export const paymentListQuerySchema = z
  .strictObject({
    cursor: z.uuid().optional(),
    userId: z.uuid().optional(),
    gateway: z.enum(['MOMO', 'VNPAY']).optional(),
    status: paymentOrderStatusSchema.optional(),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'Ngày bắt đầu phải trước ngày kết thúc.',
  });
export const paymentAdminDetailSchema = z.object({
  order: paymentOrderSchema,
  userId: z.uuid(),
  transaction: z.object({
    gatewayTransactionId: z.string().nullable(),
    gatewayResponse: z.unknown(),
    paidAt: z.string().nullable(),
  }),
  webhooks: z.array(
    z.object({
      id: z.uuid(),
      signatureValid: z.boolean(),
      processingStatus: z.string(),
      payload: z.unknown(),
      receivedAt: z.string(),
    }),
  ),
  fulfillments: z.array(
    z.object({
      id: z.uuid(),
      orderItemId: z.uuid(),
      inventoryId: z.uuid().nullable(),
      quantity: z.number(),
      fulfilledAt: z.string(),
    }),
  ),
  retries: z.array(
    z.object({
      id: z.uuid(),
      attempts: z.number(),
      lastError: z.string().nullable(),
      availableAt: z.string(),
      processedAt: z.string().nullable(),
    }),
  ),
});
export type PaymentAdminDetail = z.infer<typeof paymentAdminDetailSchema>;

/** A currency definition identifier, never a client-selected exchange rate. */
export const diamondCurrencyItemId = 'd1a00000-0000-4000-8000-000000000001';
