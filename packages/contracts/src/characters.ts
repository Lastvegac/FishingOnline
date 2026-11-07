import { z } from 'zod';

export const characterSlots = [
  'HEADWEAR',
  'HAIR',
  'UPPER',
  'LOWER',
  'SHOES',
  'BELT',
  'FACE_ACCESSORY',
  'BACK',
  'OUTERWEAR',
  'NECKLACE',
  'WRIST',
  'HANDHELD',
] as const;
export const characterAnimations = [
  'IDLE',
  'WALK',
  'RUN',
  'SIT',
  'STAND_FISHING',
  'CAST',
  'WAIT',
  'BITE',
  'HOOK',
  'FIGHT',
  'REEL',
  'CATCH',
  'HOLD_FISH',
  'CELEBRATE',
  'FAIL',
  'INTERACT',
] as const;
export const characterColors = [
  'VERMILION',
  'GOLD',
  'JADE',
  'BLUE',
  'IVORY',
  'WOOD',
  'INK',
  'SILVER',
  'WINE',
  'LILAC',
  'BLUSH',
] as const;
export const fashionPatterns = [
  'PLAIN',
  'LOTUS',
  'DRAGON',
  'PHOENIX',
  'CLOUD',
  'WAVE',
  'BAMBOO',
  'PLUM',
  'MEANDER',
] as const;
const choice = z.enum(['SOFT', 'ANGULAR', 'WEATHERED', 'SCHOLAR']);
const itemId = z.string().regex(/^[a-z][a-z0-9-]{1,63}$/);
export const appearanceSchema = z.strictObject({
  gender: z.enum(['MALE', 'FEMALE']),
  ageGroup: z.enum(['YOUNG', 'MIDDLE', 'ELDER']),
  face: z.strictObject({
    shape: choice,
    eyes: choice,
    eyebrows: choice,
    nose: choice,
    mouth: choice,
    skin: z.enum(['LIGHT', 'WARM', 'TAN', 'DEEP']),
    wrinkles: z.number().min(0).max(1),
    beard: z.enum(['NONE', 'SHORT', 'LONG']),
    mark: z.enum(['NONE', 'MOLE', 'SCAR']),
  }),
  hairColor: z.enum(characterColors),
  body: z.strictObject({
    height: z.number().min(0.9).max(1.1),
    build: z.number().min(0.85).max(1.15),
    posture: z.enum(['RELAXED', 'UPRIGHT']),
  }),
  clothColor: z.enum(characterColors),
  dyes: z
    .partialRecord(z.enum(characterSlots), z.enum(characterColors))
    .default({}),
  pattern: z.enum(fashionPatterns).default('PLAIN'),
  fabric: z.enum(['LINEN', 'SILK', 'BROCADE']).default('LINEN'),
  trimColor: z.enum(characterColors).default('GOLD'),
  fishingStyle: z.enum(['SEATED', 'STANDING']),
});
export const characterEquipmentSchema = z.strictObject(
  Object.fromEntries(
    characterSlots.map((s) => [s, itemId.nullable()]),
  ) as Record<(typeof characterSlots)[number], z.ZodNullable<typeof itemId>>,
);
export const characterSaveSchema = z.strictObject({
  expectedVersion: z.number().int().nonnegative(),
  name: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[\p{L}\p{N}_ .-]+$/u),
  presetId: itemId,
  appearance: appearanceSchema,
  equipment: characterEquipmentSchema,
});
export const characterSchema = characterSaveSchema
  .omit({ expectedVersion: true })
  .extend({
    id: z.uuid(),
    version: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
    equipmentAssets: characterEquipmentSchema.optional(),
  });
export const cosmeticSchema = z.strictObject({
  id: itemId,
  slot: z.enum([...characterSlots, 'DYE', 'PATTERN']),
  assetId: itemId,
  nameVi: z.string().max(120).default(''),
  nameEn: z.string().max(120).default(''),
  descriptionVi: z.string().max(1000).default(''),
  descriptionEn: z.string().max(1000).default(''),
  createdAt: z.iso.datetime().optional(),
  purchaseCount: z.number().int().nonnegative().default(0),
  rarity: z.enum([
    'COMMON',
    'UNCOMMON',
    'RARE',
    'EPIC',
    'LEGENDARY',
    'MYTHICAL',
  ]),
  unlockType: z.enum(['FREE', 'LEVEL', 'GOLD', 'DIAMOND']),
  priceGold: z.string().regex(/^(0|[1-9]\d{0,17})$/),
  priceDiamonds: z
    .string()
    .regex(/^(0|[1-9]\d{0,17})$/)
    .default('0'),
  collectionId: z.string().nullable().default(null),
  version: z.number().int().positive().default(1),
  startsAt: z.iso.datetime().nullable().default(null),
  endsAt: z.iso.datetime().nullable().default(null),
  minLevel: z.number().int().positive(),
  active: z.boolean(),
  owned: z.boolean(),
});
export const characterPresetSchema = z.strictObject({
  id: itemId,
  appearance: appearanceSchema,
  equipment: characterEquipmentSchema,
  animation: z.enum(characterAnimations),
  previewAsset: z.string(),
});
export const characterCatalogSchema = z.strictObject({
  presets: z.array(characterPresetSchema),
  cosmetics: z.array(cosmeticSchema),
});
export const cosmeticOrderSchema = z.strictObject({
  cosmeticId: itemId,
  currency: z.enum(['GOLD', 'DIAMOND']).default('GOLD'),
  expectedPrice: z.string().regex(/^(0|[1-9]\d{0,17})$/),
  expectedVersion: z.number().int().positive(),
});
export const presenceJoinSchema = z.strictObject({ locationId: z.uuid() });
export const presenceMoveSchema = z.strictObject({
  leaseId: z.uuid(),
  sequence: z.number().int().nonnegative(),
  x: z.number().min(-8).max(-3.5),
  z: z.number().min(1).max(5),
  action: z.enum(['IDLE', 'WALK', 'RUN', 'SIT', 'STAND_FISHING', 'INTERACT']),
});
export const presenceLeaveSchema = z.strictObject({ leaseId: z.uuid() });
export const lakeParticipantSchema = z.strictObject({
  userId: z.uuid(),
  username: z.string(),
  character: characterSchema,
  x: z.number(),
  z: z.number(),
  animation: z.enum(characterAnimations),
  level: z.number().int(),
  totalFish: z.number().int(),
  largestFishG: z.number().int(),
});
export const lakePresenceSchema = z.strictObject({
  serverTime: z.iso.datetime(),
  items: z.array(lakeParticipantSchema),
});
export type CharacterAppearance = z.infer<typeof appearanceSchema>;
export type CharacterEquipment = z.infer<typeof characterEquipmentSchema>;
export type CharacterDto = z.infer<typeof characterSchema>;
export type CharacterSaveInput = z.infer<typeof characterSaveSchema>;
export type CharacterCatalogDto = z.infer<typeof characterCatalogSchema>;
export type CosmeticDto = z.infer<typeof cosmeticSchema>;
export type CharacterAnimation = (typeof characterAnimations)[number];
export type LakeParticipantDto = z.infer<typeof lakeParticipantSchema>;
export type LakePresenceDto = z.infer<typeof lakePresenceSchema>;

export const outfitInputSchema = z.strictObject({
  name: z.string().trim().min(2).max(40),
  appearance: appearanceSchema,
  equipment: characterEquipmentSchema,
  isPublic: z.boolean().default(false),
  expectedVersion: z.number().int().nonnegative(),
});
export const outfitSchema = outfitInputSchema
  .omit({ expectedVersion: true })
  .extend({
    id: z.uuid(),
    userId: z.uuid(),
    username: z.string(),
    version: z.number().int().positive(),
    likes: z.number().int(),
    liked: z.boolean(),
    following: z.boolean().optional(),
    updatedAt: z.iso.datetime(),
  });
export type OutfitDto = z.infer<typeof outfitSchema>;
export const fashionCollectionSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
  name: z.string().min(2).max(120),
  description: z.string().max(1000),
  itemIds: z.array(z.string()).min(1).max(20),
  discountPercent: z.number().int().min(0).max(50),
  active: z.boolean(),
  version: z.number().int().positive(),
});
export type FashionCollectionDto = z.infer<typeof fashionCollectionSchema>;
export const fashionCollectionOrderSchema = z
  .strictObject({
    collectionId: z.string().max(64),
    expectedVersion: z.number().int().positive(),
    currency: z.enum(['GOLD', 'DIAMOND']).default('GOLD'),
    expectedTotal: z
      .string()
      .regex(/^\d{1,18}$/)
      .optional(),
    expectedTotalGold: z
      .string()
      .regex(/^\d{1,18}$/)
      .optional(),
  })
  .refine(
    (v) =>
      v.expectedTotal !== undefined ||
      (v.currency === 'GOLD' && v.expectedTotalGold !== undefined),
    { path: ['expectedTotal'], message: 'Expected total is required' },
  );
export const fashionEventInputSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    theme: z.string().min(2).max(1000),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    rewardGold: z.string().regex(/^(0|[1-9]\d{0,6})$/),
    rewardCosmeticId: z.string().nullable(),
    active: z.boolean(),
    expectedVersion: z.number().int().nonnegative(),
  })
  .refine((v) => v.startsAt < v.endsAt);
export interface FashionEventDto {
  id: string;
  name: string;
  theme: string;
  startsAt: string;
  endsAt: string;
  rewardGold: string;
  rewardCosmeticId: string | null;
  active: boolean;
  version: number;
  entered: boolean;
  claimed: boolean;
  entries: {
    id: string;
    userId: string;
    username: string;
    outfit: OutfitDto;
    votes: number;
    voted: boolean;
  }[];
}
export const fashionAdminItemSchema = cosmeticSchema
  .omit({ owned: true, version: true, purchaseCount: true, createdAt: true })
  .extend({
    expectedVersion: z.number().int().nonnegative(),
    reason: z.string().trim().min(5).max(1000),
  });
export interface FashionWalletDto {
  gold: string;
  diamonds: string;
  transactions: {
    id: string;
    amount: string;
    reason: string;
    createdAt: string;
  }[];
}

export const fashionPassInputSchema = z
  .strictObject({
    id: z.uuid().optional(),
    name: z.string().trim().min(2).max(120),
    kind: z.enum(['SEASON', 'MEMBERSHIP']),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    priceDiamonds: z.string().regex(/^(0|[1-9]\d{0,6})$/),
    active: z.boolean(),
    expectedVersion: z.number().int().nonnegative(),
    tiers: z
      .array(
        z.strictObject({
          id: z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),
          targetFish: z.number().int().min(0).max(100000),
          premium: z.boolean(),
          cosmeticId: z.string().min(2).max(64),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine(
    (p) =>
      p.startsAt < p.endsAt &&
      new Set(p.tiers.map((t) => t.id)).size === p.tiers.length,
  );
export interface FashionPassDto {
  id: string;
  name: string;
  kind: 'SEASON' | 'MEMBERSHIP';
  startsAt: string;
  endsAt: string;
  priceDiamonds: string;
  active: boolean;
  version: number;
  enrolled: boolean;
  purchased: boolean;
  progress: number;
  tiers: {
    id: string;
    targetFish: number;
    premium: boolean;
    cosmeticId: string;
    claimed: boolean;
  }[];
}
