import { z } from 'zod';
export * from './payments.js';

export const fishingStates = [
  'IDLE',
  'CASTING',
  'WAITING',
  'BITE',
  'HOOKING',
  'FIGHTING',
  'REELING',
  'CAUGHT',
  'ESCAPED',
  'FINISHED',
] as const;
export const rarities = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as const;
export const roles = [
  'PLAYER',
  'SUPER_ADMIN',
  'GAME_ADMIN',
  'SUPPORT',
  'ANALYST',
] as const;
export const itemKinds = ['ROD', 'LINE', 'HOOK', 'BAIT'] as const;
export const equipmentSlots = ['ROD', 'LINE', 'HOOK'] as const;
/** Terrain of a fishing spot. Drives the fish pool and which local shop goods are sold there. */
export const environments = [
  'FRESHWATER_LAKE',
  'RIVER',
  'STREAM',
  'DEEP_FOREST',
  'BRACKISH',
  'COAST',
] as const;
export type Environment = (typeof environments)[number];
/** Salinity a species tolerates. A spot only stocks fish that can live in its water. */
export const waterTypes = ['FRESH', 'BRACKISH', 'SALT'] as const;
export type WaterType = (typeof waterTypes)[number];
export const waterTypeLabels: Record<WaterType, string> = {
  FRESH: 'Nước ngọt',
  BRACKISH: 'Nước lợ',
  SALT: 'Nước mặn',
};
export const environmentWater: Record<Environment, WaterType> = {
  FRESHWATER_LAKE: 'FRESH',
  RIVER: 'FRESH',
  STREAM: 'FRESH',
  DEEP_FOREST: 'FRESH',
  BRACKISH: 'BRACKISH',
  COAST: 'SALT',
};
export const environmentLabels: Record<Environment, string> = {
  FRESHWATER_LAKE: 'Hồ nước ngọt',
  RIVER: 'Sông',
  STREAM: 'Suối',
  DEEP_FOREST: 'Rừng sâu',
  BRACKISH: 'Nước lợ',
  COAST: 'Bờ biển',
};
export type FishingState = (typeof fishingStates)[number];
export type Rarity = (typeof rarities)[number];
export type Role = (typeof roles)[number];
export type ItemKind = (typeof itemKinds)[number];
export type EquipmentSlot = (typeof equipmentSlots)[number];
export type ReelAction = 'hold' | 'release';
export type EscapeReason =
  | 'MISSED_HOOK'
  | 'LINE_BROKE'
  | 'FISH_TOO_FAR'
  | 'ABANDONED'
  | 'TIMEOUT'
  | 'EARLY_STRIKE'
  | 'SLACK_LINE'
  | 'BAIT_REJECTED'
  | 'SNAGGED';
export const uuidSchema = z.uuid();
export const moneySchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,17})$/, 'Số Gold không hợp lệ');
export const idempotencyKeySchema = uuidSchema;
const timestamp = z.iso.datetime();
const email = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
const username = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[\p{L}\p{N}_ .-]+$/u, 'Tên chỉ gồm chữ, số, khoảng trắng và _ . -');
const vietnamMobile = /^(?:\+?84|0)([35789]\d{8})$/;
/** Vietnamese mobile number, accepted as 0xxxxxxxxx or +84xxxxxxxxx and normalized to E.164. */
export const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .transform((value) => value.replace(/[\s.()-]/g, ''))
  .refine(
    (value) => vietnamMobile.test(value),
    'Số điện thoại di động Việt Nam chưa đúng (ví dụ 0912345678).',
  )
  .transform((value) => `+84${vietnamMobile.exec(value)![1]}`);
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Mã xác thực gồm 6 chữ số.');
export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự.')
  .max(128, 'Mật khẩu không được vượt quá 128 ký tự.');
export const playerSchema = z.strictObject({
  id: uuidSchema,
  /** Immutable after registration; null for phone-only accounts. */
  email: email.nullable(),
  phone: z.string().nullable(),
  username,
  avatarKey: z.string().max(100),
  level: z.number().int().min(1),
  totalXp: z.number().int().nonnegative(),
  gold: moneySchema,
  totalFish: z.number().int().nonnegative(),
  largestFishG: z.number().int().nonnegative(),
  createdAt: timestamp,
  role: z.enum(roles),
});
export type PlayerDto = z.infer<typeof playerSchema>;
export const fishPhotoMaxBytes = 5 * 1024 * 1024;
/** Upload travels with the fish mutation; binary data never enters game snapshots. */
export const fishPhotoUploadSchema = z.strictObject({
  data: z
    .string()
    .min(4)
    .max(Math.ceil(fishPhotoMaxBytes / 3) * 4)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});
export type FishPhotoUpload = z.infer<typeof fishPhotoUploadSchema>;
/** Built-in photograph key, public local image path, or HTTPS photograph URL. */
export const fishImageKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) =>
      /^\/api\/v1\/fish-photos\/[0-9a-f-]{36}$/.test(value) ||
      /^fish\/[a-z0-9-]+$/.test(value) ||
      /^\/fish\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp|avif)$/i.test(
        value,
      ) ||
      (() => {
        try {
          const url = new URL(value);
          return url.protocol === 'https:' && !url.username && !url.password;
        } catch {
          return false;
        }
      })(),
    'Use a fish image key, a /fish/ image path, or an HTTPS image URL.',
  );
export const fishSchema = z.strictObject({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  imageKey: fishImageKeySchema,
  rarity: z.enum(rarities),
  minWeightG: z.number().int().positive(),
  maxWeightG: z.number().int().positive(),
  habitat: z.string(),
  scientificName: z.string().min(1).max(120),
  waterTypes: z.array(z.enum(waterTypes)).min(1).max(3),
});
export type FishDto = z.infer<typeof fishSchema>;
export const locationSchema = z.strictObject({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  imageKey: z.string(),
  minLevel: z.number().int().min(1),
  entryFeeGold: moneySchema,
  unlocked: z.boolean(),
  environment: z.enum(environments),
});
export type LocationDto = z.infer<typeof locationSchema>;
export const inventoryItemSchema = z.strictObject({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  kind: z.enum(itemKinds),
  slot: z.enum(equipmentSlots).optional(),
  quantity: z.number().int().nonnegative(),
  upgradeLevel: z.number().int().min(0).max(2),
  equipped: z.boolean(),
  power: z.number().nonnegative(),
  control: z.number().nonnegative(),
  minLevel: z.number().int().min(1),
  imageKey: z.string(),
  upgradeCostGold: moneySchema.optional(),
});
export type InventoryItemDto = z.infer<typeof inventoryItemSchema>;
export const inventorySchema = z.strictObject({
  items: z.array(inventoryItemSchema),
  equipped: z.strictObject({
    ROD: uuidSchema.optional(),
    LINE: uuidSchema.optional(),
    HOOK: uuidSchema.optional(),
  }),
});
export type InventoryDto = z.infer<typeof inventorySchema>;
export const shopItemSchema = z.strictObject({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  kind: z.enum(itemKinds),
  imageKey: z.string(),
  priceGold: moneySchema,
  grantQuantity: z.number().int().positive(),
  minLevel: z.number().int().min(1),
  owned: z.boolean(),
  /** Slug of the granted bait/equipment definition (matches inventory items). */
  itemSlug: z.string(),
  /** Empty means the general store; otherwise the offer is sold only at these spots. */
  locationIds: z.array(uuidSchema),
  /** Gold paid per owned unit when sold back; absent when the shop does not buy it. */
  sellPriceGold: moneySchema.optional(),
});
export type ShopItemDto = z.infer<typeof shopItemSchema>;
export const waterConditionsSchema = z.strictObject({
  environment: z.enum(environments),
  weather: z.enum(['CLEAR', 'CLOUDY', 'RAIN', 'STORM', 'FOG']),
  hour: z.number().min(0).max(24),
  temperatureC: z.number().min(0).max(45),
  clarity: z.number().min(0).max(1),
  currentMps: z.number().min(0).max(5),
  windMps: z.number().min(0).max(30),
  windDirection: z.number().min(-1).max(1),
  maxDepthM: z.number().positive().max(100),
  quality: z.number().min(0).max(1),
});
export type WaterConditions = z.infer<typeof waterConditionsSchema>;
export const fishBehaviors = [
  'SWIMMING',
  'SEARCHING',
  'APPROACHING',
  'INSPECTING',
  'FEEDING',
  'BITING',
  'HOOKED',
  'FIGHTING',
  'ESCAPING',
  'EXHAUSTED',
  'CAUGHT',
] as const;
export const simulatorViewSchema = z.strictObject({
  conditions: waterConditionsSchema,
  behavior: z.enum(fishBehaviors),
  cue: z.enum(['NONE', 'NUDGE', 'DIP', 'RUN']),
  cast: z
    .strictObject({
      aim: z.number().min(0).max(1),
      distanceM: z.number().min(0).max(100),
      depthM: z.number().min(0).max(100),
      flightMs: z.number().min(0).max(3000),
      habitat: z.enum(['OPEN', 'REEDS', 'ROCKS', 'CHANNEL']),
    })
    .optional(),
  drag: z.number().min(0).max(1),
  rodAngle: z.number().min(-1).max(1),
  fishDirection: z.number().min(-1).max(1),
  lineDurability: z.number().min(0).max(100),
  rodLoad: z.number().min(0).max(100),
  distanceM: z.number().min(0).max(150),
  lineStrengthKg: z.number().positive(),
  maxDragKg: z.number().positive(),
});
export type SimulatorView = z.infer<typeof simulatorViewSchema>;
export const catchSchema = z.strictObject({
  id: uuidSchema,
  fish: fishSchema,
  weightG: z.number().int().positive(),
  lengthCm: z.number().positive().optional(),
  caughtAt: timestamp.optional(),
  locationId: uuidSchema.optional(),
  baitSlug: z.string().optional(),
  rodSlug: z.string().optional(),
  baitName: z.string().optional(),
  rodName: z.string().optional(),
  locationName: z.string().optional(),
  gold: moneySchema,
  xp: z.number().int().nonnegative(),
  /** Absent on legacy catches whose Gold was credited automatically. */
  goldDelivery: z.literal('EXCHANGE').optional(),
  newLevel: z.number().int().min(1),
  isNewSpecies: z.boolean(),
  isRecord: z.boolean(),
});
export type CatchDto = z.infer<typeof catchSchema>;
export const catchBagSchema = z.strictObject({
  items: z.array(catchSchema.extend({ caughtAt: timestamp })),
  nextCursor: uuidSchema.nullable(),
  dailyCapGold: moneySchema,
  remainingGold: moneySchema,
  resetAt: timestamp,
});
export type CatchBagDto = z.infer<typeof catchBagSchema>;
export const catchExchangeSchema = z.strictObject({
  expectedGold: moneySchema,
});
export const sessionSchema = z.strictObject({
  id: uuidSchema,
  state: z.enum(fishingStates),
  version: z.number().int().nonnegative(),
  serverTime: timestamp,
  tension: z.number().min(0).max(100),
  progress: z.number().min(0).max(100),
  stamina: z.number().min(0).max(100),
  locationId: uuidSchema.optional(),
  simulator: simulatorViewSchema.optional(),
  hookDeadline: timestamp.optional(),
  catch: catchSchema.optional(),
  escapeReason: z
    .enum([
      'MISSED_HOOK',
      'LINE_BROKE',
      'FISH_TOO_FAR',
      'ABANDONED',
      'TIMEOUT',
      'EARLY_STRIKE',
      'SLACK_LINE',
      'BAIT_REJECTED',
      'SNAGGED',
    ])
    .optional(),
});
export type SessionDto = z.infer<typeof sessionSchema>;
export const lakeMessageInputSchema = z.strictObject({
  text: z.string().trim().min(1).max(280),
  catchId: uuidSchema.optional(),
});
export const lakeMessageSchema = z.strictObject({
  id: uuidSchema,
  username: z.string(),
  userId: uuidSchema,
  text: z.string(),
  createdAt: timestamp,
  catch: catchSchema.optional(),
});
export const lakeCommunitySchema = z.strictObject({
  serverTime: timestamp,
  anglers: z.array(
    z.strictObject({
      userId: uuidSchema,
      username: z.string(),
      state: z.enum(fishingStates),
    }),
  ),
  messages: z.array(lakeMessageSchema),
  week: z.strictObject({
    startsAt: timestamp,
    endsAt: timestamp,
    entries: z.array(
      z.strictObject({
        userId: uuidSchema,
        username: z.string(),
        rank: z.number().int().positive(),
        weightG: z.number().int().positive(),
        count: z.number().int().positive(),
      }),
    ),
  }),
});
export type LakeCommunityDto = z.infer<typeof lakeCommunitySchema>;
export const collectionItemSchema = z.strictObject({
  fish: fishSchema,
  count: z.number().int().nonnegative(),
  bestWeightG: z.number().int().nonnegative(),
  bestCatch: catchSchema.optional(),
  firstCaughtAt: timestamp.optional(),
  lastCaughtAt: timestamp.optional(),
});
export type CollectionItemDto = z.infer<typeof collectionItemSchema>;
export const missionSchema = z.strictObject({
  id: uuidSchema,
  name: z.string(),
  description: z.string(),
  target: z.number().int().positive(),
  progress: z.number().int().nonnegative(),
  rewardGold: moneySchema,
  rewardXp: z.number().int().nonnegative(),
  claimedAt: timestamp.nullable(),
  completedAt: timestamp.nullable(),
  claimDeadline: timestamp,
  periodKey: z.string(),
});
export type MissionDto = z.infer<typeof missionSchema>;
export const leaderboardEntrySchema = z.strictObject({
  rank: z.number().int().positive(),
  userId: uuidSchema,
  username: z.string(),
  avatarKey: z.string(),
  level: z.number().int().min(1),
  totalFish: z.number().int().nonnegative(),
  largestFishG: z.number().int().nonnegative(),
  totalXp: z.number().int().nonnegative(),
});
export type LeaderboardEntryDto = z.infer<typeof leaderboardEntrySchema>;
export interface AchievementDto {
  id: string;
  name: string;
  description: string;
  unlockedAt: string | null;
}
export interface WalletTransactionDto {
  id: string;
  amount: string;
  balanceAfter: string;
  reason: string;
  createdAt: string;
}
/** Read-only admin view. Owner identity is current; ledger values are immutable. */
export interface AdminWalletTransactionDto {
  id: string;
  walletId: string;
  userId: string;
  username: string | null;
  deltaGold: string;
  balanceAfterGold: string;
  reason: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  createdAt: string;
}
export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
  fields?: Record<string, string[]>;
  formErrors?: string[];
}
export const apiErrorSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
  formErrors: z.array(z.string()).optional(),
});
export type ApiResponse<T> = { data: T } | { error: ApiError };
export const avatarKeys = [
  'angler-1',
  'angler-2',
  'angler-3',
  'angler-4',
] as const;
export const signupChannels = ['email', 'phone'] as const;
/** Step 1 of registration: validates details and sends an OTP; no account is created yet. */
export const registerSchema = z
  .strictObject({
    channel: z.enum(signupChannels).default('email'),
    email: email.optional(),
    phone: phoneSchema.optional(),
    username,
    password: passwordSchema,
    acceptTerms: z.literal(true),
  })
  .superRefine((value, issue) => {
    const field = value.channel;
    const other = field === 'email' ? 'phone' : 'email';
    if (!value[field])
      issue.addIssue({
        code: 'custom',
        path: [field],
        message:
          field === 'email'
            ? 'Vui lòng nhập địa chỉ email.'
            : 'Vui lòng nhập số điện thoại.',
      });
    if (value[other])
      issue.addIssue({
        code: 'custom',
        path: [other],
        message: 'Chỉ dùng một hình thức đăng ký.',
      });
  });
/** Step 2: proves control of the email/phone and creates the account. */
export const otpVerifySchema = z.strictObject({
  challengeId: uuidSchema,
  code: otpCodeSchema,
});
export const otpResendSchema = z.strictObject({ challengeId: uuidSchema });
export interface OtpChallengeDto {
  challengeId: string;
  channel: 'EMAIL' | 'SMS';
  destination: string;
  expiresAt: string;
  resendAfter: string;
}
export const googleAuthSchema = z.strictObject({
  credential: z.string().min(20).max(4096),
  username: username.optional(),
  acceptTerms: z.literal(true).optional(),
});
export interface AuthProvidersDto {
  email: boolean;
  phone: boolean;
  google: { clientId: string } | null;
}
const oneIdentifier = (
  value: { email?: string; phone?: string },
  issue: z.RefinementCtx,
) => {
  if (!value.email && !value.phone)
    issue.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'Vui lòng nhập email hoặc số điện thoại.',
    });
  if (value.email && value.phone)
    issue.addIssue({
      code: 'custom',
      path: ['phone'],
      message: 'Chỉ dùng email hoặc số điện thoại.',
    });
};
export const loginSchema = z
  .strictObject({
    email: email.optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema,
  })
  .superRefine(oneIdentifier);
export const forgotPasswordSchema = z
  .strictObject({ email: email.optional(), phone: phoneSchema.optional() })
  .superRefine(oneIdentifier);
export const resetPasswordSchema = z.strictObject({
  token: z.string().min(32).max(512),
  password: passwordSchema,
});
/**
 * Requests an OTP for a profile change. Only username and avatar are editable;
 * the strict object rejects email/phone so they cannot be changed here.
 */
export const updateProfileSchema = z
  .strictObject({
    username: username.optional(),
    avatarKey: z.enum(avatarKeys).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Không có thay đổi');
export const createSessionSchema = z.strictObject({
  locationId: uuidSchema,
  baitInventoryId: uuidSchema,
});
const expectedVersion = z.number().int().nonnegative();
export const castSchema = z.strictObject({
  expectedVersion,
  aim: z.number().min(0).max(1),
  power: z.number().min(0).max(1),
  depth: z.number().min(0).max(1).optional(),
});
export const hookSchema = z.strictObject({ expectedVersion });
export const reelSchema = z.strictObject({
  expectedVersion,
  action: z.enum(['hold', 'release']),
  drag: z.number().min(0).max(1).optional(),
  rodAngle: z.number().min(-1).max(1).optional(),
});
export const completeSchema = z.strictObject({ expectedVersion });
export const shopOrderSchema = z.strictObject({
  shopItemId: uuidSchema,
  quantity: z.number().int().min(1).max(100),
  expectedUnitPriceGold: moneySchema,
  configVersion: z.number().int().positive(),
  /** Required for local goods: the unlocked spot whose shop sells the offer. */
  locationId: uuidSchema.optional(),
});
export const shopSaleSchema = z.strictObject({
  shopItemId: uuidSchema,
  inventoryItemId: uuidSchema,
  quantity: z.number().int().min(1).max(1000),
  expectedUnitPriceGold: moneySchema,
  configVersion: z.number().int().positive(),
  locationId: uuidSchema.optional(),
});
export const shopQuerySchema = z.strictObject({
  locationId: uuidSchema.optional(),
});
export const missionClaimSchema = z.strictObject({
  periodKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const equipSchema = z.strictObject({ inventoryItemId: uuidSchema });
export const unequipSchema = z.strictObject({ slot: z.enum(equipmentSlots) });
export const upgradeSchema = z.strictObject({
  inventoryItemId: uuidSchema,
  expectedUpgradeLevel: z.number().int().min(0).max(1),
});
export const useItemSchema = z.strictObject({
  inventoryItemId: uuidSchema,
  quantity: z.number().int().min(1).max(100),
});
export const leaderboardQuerySchema = z.strictObject({
  metric: z
    .enum(['largestFish', 'totalFish', 'totalXp'])
    .default('largestFish'),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CastInput = z.infer<typeof castSchema>;
export type ReelInput = z.infer<typeof reelSchema>;
export type ShopOrderInput = z.infer<typeof shopOrderSchema>;
export type ShopSaleInput = z.infer<typeof shopSaleSchema>;

export * from './characters.js';
