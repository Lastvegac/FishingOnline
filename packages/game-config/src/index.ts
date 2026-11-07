import { z } from 'zod';
export { LAUNCH_PRICING_ID, LAUNCH_COSMETIC_PRICES, LAUNCH_DIAMOND_PACKS } from './launch-pricing.js';
import { behaviorProfileSchema, waterProfileSchema } from './simulator.js';
export {
  behaviorFor,
  conditionsFor,
  DEFAULT_UTC_OFFSET_MINUTES,
  tackleFor,
  baitMassG,
} from './simulator.js';
export type { BehaviorProfile, TackleProfile } from './simulator.js';
import {
  environmentWater,
  environments,
  fishSchema,
  itemKinds,
  rarities,
} from '@fwo/contracts';
import type {
  EquipmentSlot,
  FishDto,
  ItemKind,
  LocationDto,
  WaterType,
} from '@fwo/contracts';

/** Server-only configuration. Never import this package from a browser application. */
export const stableId = (suffix: number): string =>
  `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
export const fishConfigSchema = fishSchema
  .extend({
    spawnWeight: z.number().min(0).max(10000),
    baseWeightG: z.number().int().positive().max(1000000),
    baseRewardGold: z.number().int().min(1).max(10000),
    baseXp: z.number().int().min(1).max(10000),
    difficulty: z.number().int().min(1).max(100),
    pullStrength: z.number().min(1).max(10),
    hookWindowMs: z.number().int().min(1400).max(5000),
    surgeMinMs: z.number().int().min(500).max(10000),
    surgeMaxMs: z.number().int().min(500).max(15000),
    preferredBaits: z.array(z.string().min(1)).min(1),
    behavior: behaviorProfileSchema.optional(),
  })
  .refine(
    (fish) =>
      fish.minWeightG <= fish.baseWeightG &&
      fish.baseWeightG <= fish.maxWeightG &&
      fish.surgeMinMs <= fish.surgeMaxMs,
    'Weight hoặc surge range không hợp lệ',
  );
export type FishConfig = z.infer<typeof fishConfigSchema>;
export interface LocationConfig extends Omit<LocationDto, 'unlocked'> {
  fishIds: string[];
  water?: z.infer<typeof waterProfileSchema>;
}
export interface EquipmentConfig {
  id: string;
  slug: string;
  name: string;
  kind: Exclude<ItemKind, 'BAIT'>;
  slot: EquipmentSlot;
  power: number;
  control: number;
  minLevel: number;
  imageKey: string;
}
export interface BaitConfig {
  id: string;
  slug: string;
  name: string;
  kind: 'BAIT';
  minLevel: number;
  imageKey: string;
}
export interface ShopConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: ItemKind;
  imageKey: string;
  priceGold: string;
  grantQuantity: number;
  minLevel: number;
  itemId: string;
  /** Spots whose local shop sells this offer. Absent/empty means the general store. */
  locationIds?: string[];
  /** Gold paid per owned unit when sold back. Absent means the shop does not buy it. */
  sellPriceGold?: string;
}
export type ProgressMetric = 'CATCH_COUNT' | 'SPECIES_COUNT' | 'TOTAL_WEIGHT_G';
export interface MissionConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  metric: ProgressMetric;
  target: number;
  rewardGold: string;
  rewardXp: number;
}
export interface AchievementConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  metric: ProgressMetric;
  target: number;
}
export interface GameConfig {
  version: number;
  fish: FishConfig[];
  locations: LocationConfig[];
  equipment: EquipmentConfig[];
  baits: BaitConfig[];
  shop: ShopConfig[];
  missions: MissionConfig[];
  achievements: AchievementConfig[];
}

const rows: Array<
  [
    string,
    string,
    string,
    (typeof rarities)[number],
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    string[],
  ]
> = [
  [
    'carp',
    'Cá chép',
    'Thân vàng óng, thường kiếm ăn gần bờ hồ.',
    'COMMON',
    10,
    300,
    1200,
    4000,
    15,
    12,
    22,
    3,
    2200,
    ['corn', 'worm'],
  ],
  [
    'grass-carp',
    'Cá trắm',
    'Thân dài, sức kéo khỏe giữa những đám cây nước.',
    'UNCOMMON',
    14,
    800,
    2500,
    8000,
    28,
    18,
    38,
    5,
    2000,
    ['corn'],
  ],
  [
    'tilapia',
    'Cá rô phi',
    'Dễ gặp ở vùng nước nông, phù hợp người mới.',
    'COMMON',
    24,
    150,
    600,
    2000,
    10,
    10,
    15,
    2,
    2400,
    ['worm', 'bran'],
  ],
  [
    'snakehead',
    'Cá lóc',
    'Ẩn mình ven cỏ và vùng vẫy mạnh khi mắc câu.',
    'RARE',
    8,
    400,
    1600,
    5000,
    45,
    28,
    52,
    6,
    1800,
    ['worm'],
  ],
  [
    'walking-catfish',
    'Cá trê',
    'Cá da trơn kiếm ăn gần đáy hồ.',
    'UNCOMMON',
    11,
    300,
    1400,
    4500,
    25,
    17,
    32,
    4,
    2200,
    ['worm'],
  ],
  [
    'pangasius',
    'Cá tra',
    'Mục tiêu lớn có sức kéo bền ở vùng nước sâu.',
    'EPIC',
    5,
    1000,
    4000,
    12000,
    80,
    45,
    72,
    8,
    1600,
    ['bran', 'worm'],
  ],
  [
    'silver-carp',
    'Cá mè',
    'Bơi ở tầng giữa, cần giữ lực kéo thật đều.',
    'RARE',
    5,
    600,
    2000,
    7000,
    40,
    25,
    48,
    6,
    1900,
    ['bran', 'corn'],
  ],
  [
    'climbing-perch',
    'Cá rô',
    'Nhỏ và linh hoạt giữa những khóm sen.',
    'COMMON',
    12,
    80,
    250,
    800,
    8,
    8,
    18,
    2,
    2300,
    ['worm'],
  ],
  [
    'giant-gourami',
    'Cá tai tượng',
    'Một mục tiêu sưu tập hiếm trong vùng nước yên.',
    'LEGENDARY',
    2,
    500,
    2000,
    6000,
    120,
    65,
    85,
    9,
    1400,
    ['worm'],
  ],
  [
    'red-tilapia',
    'Cá diêu hồng',
    'Sắc hồng nổi bật trên mặt nước ấm.',
    'COMMON',
    9,
    200,
    800,
    2500,
    12,
    11,
    20,
    3,
    2300,
    ['bran', 'worm'],
  ],
  // River — Bến Sông Đào (nước ngọt, dòng chảy)
  [
    'river-goby',
    'Cá bống cát',
    'Nằm im dưới lớp cát đáy sông, cắn mồi rất nhẹ.',
    'COMMON',
    22,
    30,
    120,
    350,
    9,
    9,
    12,
    2,
    2400,
    ['worm', 'snail'],
  ],
  [
    'chub',
    'Cá chày',
    'Mắt đỏ, bơi theo đàn ở dòng nước chảy vừa.',
    'UNCOMMON',
    12,
    200,
    700,
    2000,
    20,
    15,
    30,
    4,
    2100,
    ['corn', 'bran'],
  ],
  [
    'bagrid-catfish',
    'Cá ngạnh',
    'Có gai ngạnh sắc, rúc đáy sông khi nước đục.',
    'UNCOMMON',
    11,
    150,
    600,
    1800,
    22,
    16,
    34,
    4,
    2100,
    ['worm', 'minnow'],
  ],
  [
    'hemibagrus',
    'Cá lăng nha',
    'Da trơn, thân dài, kéo dai dẳng giữa dòng sâu.',
    'RARE',
    7,
    1000,
    3500,
    12000,
    55,
    32,
    58,
    7,
    1800,
    ['minnow', 'snail'],
  ],
  [
    'giant-barb',
    'Cá hô',
    'Loài cá chép khổng lồ của những khúc sông lớn.',
    'LEGENDARY',
    1.5,
    5000,
    15000,
    40000,
    160,
    80,
    90,
    10,
    1400,
    ['bran', 'corn'],
  ],
  // Stream — Suối Đá Mây (nước ngọt, lạnh, nhiều đá)
  [
    'stream-minnow',
    'Cá mương',
    'Nhỏ, nhanh, lấp lánh dưới nắng suối.',
    'COMMON',
    22,
    30,
    100,
    300,
    8,
    8,
    10,
    2,
    2500,
    ['worm', 'cricket'],
  ],
  [
    'stream-loach',
    'Cá chạch bùn',
    'Luồn lách giữa sỏi và bùn, trơn như lụa.',
    'COMMON',
    14,
    40,
    150,
    400,
    10,
    10,
    16,
    3,
    2300,
    ['worm'],
  ],
  [
    'hampala',
    'Cá ngựa xám',
    'Vây đỏ cam, rình mồi ở vực suối nước chảy.',
    'UNCOMMON',
    12,
    200,
    800,
    3000,
    20,
    15,
    30,
    5,
    2000,
    ['cricket', 'minnow'],
  ],
  [
    'spinibarbus',
    'Cá bỗng',
    'Loài cá suối núi phía Bắc, thận trọng và rất khỏe.',
    'RARE',
    6,
    500,
    2000,
    8000,
    55,
    32,
    58,
    7,
    1800,
    ['bran', 'corn'],
  ],
  [
    'bagarius',
    'Cá chiên',
    'Ẩn trong hốc đá thác, giật mạnh bất ngờ.',
    'EPIC',
    3,
    2000,
    6000,
    20000,
    95,
    52,
    78,
    9,
    1500,
    ['minnow', 'cricket'],
  ],
  [
    'mahseer',
    'Cá ngựa nam',
    'Vảy vàng đồng, huyền thoại của những con suối rừng đầu nguồn.',
    'LEGENDARY',
    1.5,
    2000,
    6000,
    20000,
    150,
    75,
    88,
    9,
    1400,
    ['bran', 'corn'],
  ],
  // Deep forest — Đầm Rừng Sâu (nước ngọt tù, đầm lầy rừng tràm)
  [
    'snakeskin-gourami',
    'Cá sặc rằn',
    'Vân sọc như da rắn, sống ven bèo rừng tràm.',
    'COMMON',
    22,
    60,
    180,
    450,
    9,
    9,
    12,
    2,
    2400,
    ['worm', 'bran'],
  ],
  [
    'featherback',
    'Cá thát lát',
    'Thân dẹt như lưỡi dao, lượn quanh rễ cây ngập.',
    'UNCOMMON',
    12,
    150,
    500,
    1500,
    22,
    16,
    30,
    4,
    2100,
    ['minnow', 'cricket'],
  ],
  [
    'clown-featherback',
    'Cá còm',
    'Chấm tròn nổi bật, săn mồi lúc chạng vạng.',
    'RARE',
    6,
    500,
    1800,
    5000,
    50,
    30,
    55,
    6,
    1800,
    ['minnow'],
  ],
  [
    'giant-snakehead',
    'Cá lóc bông',
    'Chúa tể đầm lầy, quẫy mạnh khi bị kéo khỏi tán lá.',
    'EPIC',
    3,
    1500,
    5000,
    15000,
    100,
    55,
    80,
    9,
    1500,
    ['minnow', 'cricket'],
  ],
  // Brackish — Cửa Sông Nước Lợ
  [
    'mudskipper-goby',
    'Cá kèo',
    'Sống ở bãi bùn cửa sông, dễ câu khi nước ròng.',
    'COMMON',
    24,
    30,
    90,
    250,
    9,
    9,
    10,
    2,
    2400,
    ['worm', 'shrimp'],
  ],
  [
    'mullet',
    'Cá đối mục',
    'Bơi theo đàn nơi nước mặn gặp nước ngọt.',
    'UNCOMMON',
    13,
    200,
    700,
    2000,
    22,
    16,
    30,
    4,
    2100,
    ['bran', 'snail'],
  ],
  [
    'spotted-scat',
    'Cá nâu',
    'Thân tròn đốm nâu, quanh quẩn rễ đước.',
    'UNCOMMON',
    10,
    100,
    350,
    900,
    24,
    17,
    32,
    4,
    2100,
    ['shrimp', 'snail'],
  ],
  [
    'barramundi',
    'Cá chẽm',
    'Thợ săn ở cửa sông và ven biển, bật nhảy khỏi mặt nước.',
    'RARE',
    6,
    1000,
    3500,
    10000,
    60,
    34,
    60,
    7,
    1700,
    ['shrimp', 'minnow'],
  ],
  [
    'mangrove-snapper',
    'Cá hồng bạc',
    'Ẩn dưới rễ đước, cắn mồi dứt khoát rồi lao vào hang.',
    'EPIC',
    3,
    1000,
    3500,
    12000,
    110,
    58,
    80,
    8,
    1500,
    ['shrimp', 'minnow'],
  ],
  // Coast — Ghềnh Biển Gió (nước mặn)
  [
    'sillago',
    'Cá đục',
    'Thân thon bạc, kiếm ăn trên bãi cát sát bờ.',
    'COMMON',
    24,
    50,
    150,
    400,
    10,
    10,
    12,
    2,
    2400,
    ['shrimp'],
  ],
  [
    'round-scad',
    'Cá nục',
    'Bơi theo đàn lớn ven bờ, cắn mồi liên tục.',
    'COMMON',
    18,
    60,
    150,
    350,
    11,
    10,
    14,
    3,
    2300,
    ['shrimp', 'squid'],
  ],
  [
    'spanish-mackerel',
    'Cá thu',
    'Lao nhanh theo con sóng, kéo căng dây liên tục.',
    'UNCOMMON',
    12,
    800,
    3000,
    9000,
    30,
    20,
    36,
    6,
    2000,
    ['squid', 'minnow'],
  ],
  [
    'pompano',
    'Cá chim vây vàng',
    'Thân dẹt bạc, lướt theo sóng vỗ bờ cát.',
    'RARE',
    7,
    500,
    2000,
    6000,
    55,
    32,
    55,
    6,
    1800,
    ['shrimp', 'squid'],
  ],
  [
    'barracuda',
    'Cá nhồng',
    'Răng sắc, đớp mồi như tên bắn.',
    'RARE',
    6,
    1000,
    3000,
    9000,
    58,
    33,
    62,
    8,
    1600,
    ['squid', 'minnow'],
  ],
  [
    'grouper',
    'Cá mú chấm cam',
    'Rúc vào hang đá ngay khi mắc câu — giữ thật chắc.',
    'EPIC',
    3,
    1500,
    5000,
    20000,
    115,
    60,
    82,
    9,
    1500,
    ['shrimp', 'squid'],
  ],
  [
    'giant-grouper',
    'Cá mú nghệ',
    'Gã khổng lồ của rạn đá ven bờ, hiếm khi rời hang.',
    'LEGENDARY',
    1.2,
    8000,
    20000,
    60000,
    200,
    90,
    95,
    10,
    1400,
    ['squid', 'shrimp'],
  ],
];
/**
 * Real-world ecology per species: scientific name, tolerated salinity and habitat.
 * Spot pools are validated against this so e.g. carp never appears at the coast.
 */
const ecology: Record<
  string,
  { scientificName: string; waterTypes: WaterType[]; habitat: string }
> = {
  carp: {
    scientificName: 'Cyprinus carpio',
    waterTypes: ['FRESH'],
    habitat: 'Hồ, ao, sông nước ngọt',
  },
  'grass-carp': {
    scientificName: 'Ctenopharyngodon idella',
    waterTypes: ['FRESH'],
    habitat: 'Hồ và sông nước ngọt nhiều cây thủy sinh',
  },
  tilapia: {
    scientificName: 'Oreochromis niloticus',
    waterTypes: ['FRESH', 'BRACKISH'],
    habitat: 'Ao hồ nước ngọt, chịu được nước lợ nhạt',
  },
  snakehead: {
    scientificName: 'Channa striata',
    waterTypes: ['FRESH'],
    habitat: 'Ao, ruộng, đầm lầy nước ngọt',
  },
  'walking-catfish': {
    scientificName: 'Clarias batrachus',
    waterTypes: ['FRESH'],
    habitat: 'Ao, mương, đầm lầy nước ngọt',
  },
  pangasius: {
    scientificName: 'Pangasianodon hypophthalmus',
    waterTypes: ['FRESH'],
    habitat: 'Sông lớn và hồ chứa nước ngọt',
  },
  'silver-carp': {
    scientificName: 'Hypophthalmichthys molitrix',
    waterTypes: ['FRESH'],
    habitat: 'Hồ và sông nước ngọt, tầng giữa',
  },
  'climbing-perch': {
    scientificName: 'Anabas testudineus',
    waterTypes: ['FRESH'],
    habitat: 'Ao, ruộng, đầm và suối chậm nước ngọt',
  },
  'giant-gourami': {
    scientificName: 'Osphronemus goramy',
    waterTypes: ['FRESH'],
    habitat: 'Hồ, đầm nước ngọt yên tĩnh',
  },
  'red-tilapia': {
    scientificName: 'Oreochromis sp. (dòng đỏ)',
    waterTypes: ['FRESH', 'BRACKISH'],
    habitat: 'Ao hồ nước ngọt ấm',
  },
  'river-goby': {
    scientificName: 'Glossogobius giuris',
    waterTypes: ['FRESH', 'BRACKISH'],
    habitat: 'Đáy cát sông nước ngọt',
  },
  chub: {
    scientificName: 'Squaliobarbus curriculus',
    waterTypes: ['FRESH'],
    habitat: 'Sông suối nước ngọt chảy vừa',
  },
  'bagrid-catfish': {
    scientificName: 'Cranoglanis bouderius',
    waterTypes: ['FRESH'],
    habitat: 'Đáy sông nước ngọt',
  },
  hemibagrus: {
    scientificName: 'Hemibagrus wyckioides',
    waterTypes: ['FRESH'],
    habitat: 'Sông lớn nước ngọt, tầng đáy',
  },
  'giant-barb': {
    scientificName: 'Catlocarpio siamensis',
    waterTypes: ['FRESH'],
    habitat: 'Sông lớn nước ngọt (lưu vực Mê Kông)',
  },
  'stream-minnow': {
    scientificName: 'Hemiculter leucisculus',
    waterTypes: ['FRESH'],
    habitat: 'Suối, sông, hồ nước ngọt tầng mặt',
  },
  'stream-loach': {
    scientificName: 'Misgurnus anguillicaudatus',
    waterTypes: ['FRESH'],
    habitat: 'Suối, ruộng, đáy bùn nước ngọt',
  },
  hampala: {
    scientificName: 'Hampala macrolepidota',
    waterTypes: ['FRESH'],
    habitat: 'Sông suối nước ngọt chảy',
  },
  spinibarbus: {
    scientificName: 'Spinibarbus denticulatus',
    waterTypes: ['FRESH'],
    habitat: 'Suối núi nước ngọt trong, lạnh',
  },
  bagarius: {
    scientificName: 'Bagarius yarrelli',
    waterTypes: ['FRESH'],
    habitat: 'Thác ghềnh sông suối nước ngọt',
  },
  mahseer: {
    scientificName: 'Tor tambroides',
    waterTypes: ['FRESH'],
    habitat: 'Suối rừng đầu nguồn nước ngọt',
  },
  'snakeskin-gourami': {
    scientificName: 'Trichopodus pectoralis',
    waterTypes: ['FRESH'],
    habitat: 'Đầm lầy, ruộng nước ngọt nhiều bèo',
  },
  featherback: {
    scientificName: 'Notopterus notopterus',
    waterTypes: ['FRESH'],
    habitat: 'Đầm, hồ nước ngọt nhiều rễ cây',
  },
  'clown-featherback': {
    scientificName: 'Chitala ornata',
    waterTypes: ['FRESH'],
    habitat: 'Đầm lầy, sông chậm nước ngọt',
  },
  'giant-snakehead': {
    scientificName: 'Channa micropeltes',
    waterTypes: ['FRESH'],
    habitat: 'Đầm lầy, hồ rừng nước ngọt',
  },
  'mudskipper-goby': {
    scientificName: 'Pseudapocryptes elongatus',
    waterTypes: ['BRACKISH'],
    habitat: 'Bãi bùn cửa sông nước lợ',
  },
  mullet: {
    scientificName: 'Mugil cephalus',
    waterTypes: ['BRACKISH', 'SALT'],
    habitat: 'Cửa sông nước lợ và ven biển',
  },
  'spotted-scat': {
    scientificName: 'Scatophagus argus',
    waterTypes: ['BRACKISH', 'SALT'],
    habitat: 'Rừng ngập mặn, cửa sông nước lợ',
  },
  barramundi: {
    scientificName: 'Lates calcarifer',
    waterTypes: ['FRESH', 'BRACKISH', 'SALT'],
    habitat: 'Cửa sông nước lợ và ven biển',
  },
  'mangrove-snapper': {
    scientificName: 'Lutjanus argentimaculatus',
    waterTypes: ['BRACKISH', 'SALT'],
    habitat: 'Rừng ngập mặn, cửa sông nước lợ',
  },
  sillago: {
    scientificName: 'Sillago sihama',
    waterTypes: ['BRACKISH', 'SALT'],
    habitat: 'Bãi cát ven biển nước mặn',
  },
  'round-scad': {
    scientificName: 'Decapterus maruadsi',
    waterTypes: ['SALT'],
    habitat: 'Vùng biển ven bờ nước mặn',
  },
  'spanish-mackerel': {
    scientificName: 'Scomberomorus commerson',
    waterTypes: ['SALT'],
    habitat: 'Biển ven bờ và rạn đá nước mặn',
  },
  pompano: {
    scientificName: 'Trachinotus blochii',
    waterTypes: ['SALT'],
    habitat: 'Bãi cát và rạn ven biển nước mặn',
  },
  barracuda: {
    scientificName: 'Sphyraena barracuda',
    waterTypes: ['SALT'],
    habitat: 'Rạn san hô, ghềnh đá nước mặn',
  },
  grouper: {
    scientificName: 'Epinephelus coioides',
    waterTypes: ['BRACKISH', 'SALT'],
    habitat: 'Rạn đá ven biển, cửa sông nước mặn',
  },
  'giant-grouper': {
    scientificName: 'Epinephelus lanceolatus',
    waterTypes: ['BRACKISH', 'SALT'],
    habitat: 'Rạn đá ven biển nước mặn',
  },
};
export const fishSpecies: FishConfig[] = rows.map((row, index) => ({
  id: stableId(101 + index),
  slug: row[0],
  name: row[1],
  description: row[2],
  imageKey: `fish/${row[0]}`,
  rarity: row[3],
  spawnWeight: row[4],
  minWeightG: row[5],
  baseWeightG: row[6],
  maxWeightG: row[7],
  baseRewardGold: row[8],
  baseXp: row[9],
  difficulty: row[10],
  pullStrength: row[11],
  hookWindowMs: row[12],
  preferredBaits: row[13],
  ...ecology[row[0]],
  surgeMinMs: row[10] > 50 ? 1500 : 2500,
  surgeMaxMs: row[10] > 50 ? 3000 : 4500,
}));
const fishIdsBySlug = (...slugs: string[]): string[] =>
  slugs.map((slug) => {
    const fish = fishSpecies.find((entry) => entry.slug === slug);
    if (!fish) throw new Error(`Unknown fish slug ${slug}`);
    return fish.id;
  });
export const locations: LocationConfig[] = [
  {
    id: stableId(201),
    slug: 'ho-sen',
    name: 'Hồ Sen',
    description:
      'Một góc bình yên giữa đồi xanh và những khóm sen. Mười loài cá nước ngọt đang chờ bạn khám phá.',
    imageKey: 'locations/ho-sen',
    minLevel: 1,
    entryFeeGold: '0',
    environment: 'FRESHWATER_LAKE',
    fishIds: fishSpecies.slice(0, 10).map((fish) => fish.id),
  },
  {
    id: stableId(202),
    slug: 'song-dao',
    name: 'Bến Sông Đào',
    description:
      'Dòng sông phù sa chảy qua bãi ngô. Cá đáy sông khỏe, hợp mồi ốc và cá mồi sống.',
    imageKey: 'locations/song-dao',
    minLevel: 2,
    entryFeeGold: '5',
    environment: 'RIVER',
    fishIds: fishIdsBySlug(
      'river-goby',
      'carp',
      'grass-carp',
      'silver-carp',
      'chub',
      'bagrid-catfish',
      'pangasius',
      'hemibagrus',
      'giant-barb',
    ),
  },
  {
    id: stableId(203),
    slug: 'suoi-da-may',
    name: 'Suối Đá Mây',
    description:
      'Con suối trong vắt chảy qua ghềnh đá núi. Cá nhỏ nhanh nhẹn, dế mèn là mồi được ưa chuộng.',
    imageKey: 'locations/suoi-da-may',
    minLevel: 3,
    entryFeeGold: '10',
    environment: 'STREAM',
    fishIds: fishIdsBySlug(
      'stream-minnow',
      'stream-loach',
      'climbing-perch',
      'hampala',
      'spinibarbus',
      'bagarius',
      'mahseer',
    ),
  },
  {
    id: stableId(204),
    slug: 'dam-rung-sau',
    name: 'Đầm Rừng Sâu',
    description:
      'Đầm nước tù dưới tán rừng tràm. Cá săn mồi ẩn mình giữa rễ cây ngập.',
    imageKey: 'locations/dam-rung-sau',
    minLevel: 4,
    entryFeeGold: '15',
    environment: 'DEEP_FOREST',
    fishIds: fishIdsBySlug(
      'snakeskin-gourami',
      'climbing-perch',
      'walking-catfish',
      'snakehead',
      'featherback',
      'clown-featherback',
      'giant-gourami',
      'giant-snakehead',
    ),
  },
  {
    id: stableId(205),
    slug: 'cua-song-nuoc-lo',
    name: 'Cửa Sông Nước Lợ',
    description:
      'Nơi sông gặp biển giữa rừng đước. Thủy triều lên xuống đưa cá nước lợ vào bờ.',
    imageKey: 'locations/cua-song-nuoc-lo',
    minLevel: 5,
    entryFeeGold: '20',
    environment: 'BRACKISH',
    fishIds: fishIdsBySlug(
      'mudskipper-goby',
      'tilapia',
      'mullet',
      'spotted-scat',
      'barramundi',
      'grouper',
      'mangrove-snapper',
    ),
  },
  {
    id: stableId(206),
    slug: 'ghenh-bien-gio',
    name: 'Ghềnh Biển Gió',
    description:
      'Mỏm đá nhô ra biển khơi, sóng vỗ quanh năm. Cần ném biển và mồi mực giúp chạm tới cá lớn.',
    imageKey: 'locations/ghenh-bien-gio',
    minLevel: 6,
    entryFeeGold: '25',
    environment: 'COAST',
    fishIds: fishIdsBySlug(
      'sillago',
      'round-scad',
      'mullet',
      'spanish-mackerel',
      'pompano',
      'barracuda',
      'barramundi',
      'grouper',
      'giant-grouper',
    ),
  },
];
const rod = (
  suffix: number,
  slug: string,
  name: string,
  kind: EquipmentConfig['kind'],
  power: number,
  control: number,
  minLevel: number,
): EquipmentConfig => ({
  id: stableId(suffix),
  slug,
  name,
  kind,
  slot: kind,
  power,
  control,
  minLevel,
  imageKey: `items/${slug}`,
});
export const equipment: EquipmentConfig[] = [
  rod(301, 'wood-rod', 'Cần gỗ', 'ROD', 4, 3, 1),
  rod(302, 'bamboo-rod', 'Cần tre', 'ROD', 6, 5, 2),
  rod(303, 'composite-rod', 'Cần composite', 'ROD', 9, 7, 4),
  rod(304, 'nylon-line', 'Dây nylon', 'LINE', 0, 0, 1),
  rod(305, 'basic-hook', 'Lưỡi câu cơ bản', 'HOOK', 0, 0, 1),
  // Terrain gear: line and hook stats add to the rod for the whole loadout.
  rod(306, 'river-rod', 'Cần sông dài', 'ROD', 8, 6, 3),
  rod(307, 'stream-rod', 'Cần suối ngắn', 'ROD', 6, 9, 3),
  rod(308, 'swamp-rod', 'Cần lóc rừng', 'ROD', 10, 6, 4),
  rod(309, 'surf-rod', 'Cần ném biển', 'ROD', 12, 8, 6),
  rod(310, 'fluoro-line', 'Dây fluorocarbon', 'LINE', 0, 2, 3),
  rod(311, 'braided-line', 'Dây dù bện', 'LINE', 2, 1, 5),
  rod(312, 'circle-hook', 'Lưỡi câu tròn', 'HOOK', 0, 1, 3),
  rod(313, 'saltwater-hook', 'Lưỡi câu chống gỉ', 'HOOK', 1, 1, 6),
];
const bait = (
  suffix: number,
  slug: string,
  name: string,
  minLevel: number,
): BaitConfig => ({
  id: stableId(suffix),
  slug,
  name,
  kind: 'BAIT',
  minLevel,
  imageKey: `items/${slug}`,
});
export const baits: BaitConfig[] = [
  bait(401, 'worm', 'Giun đất', 1),
  bait(402, 'corn', 'Ngô ngọt', 2),
  bait(403, 'bran', 'Cám thơm', 2),
  bait(404, 'snail', 'Ốc bươu', 2),
  bait(405, 'cricket', 'Dế mèn', 3),
  bait(406, 'minnow', 'Cá mồi sống', 3),
  bait(407, 'shrimp', 'Tôm sống', 5),
  bait(408, 'squid', 'Mực cắt khúc', 6),
];
const at = (...slugs: string[]): string[] =>
  slugs.map((slug) => locations.find((entry) => entry.slug === slug)!.id);
const offer = (
  suffix: number,
  slug: string,
  input: {
    description?: string;
    priceGold: string;
    grantQuantity?: number;
    locationIds?: string[];
    sellPriceGold?: string;
  },
): ShopConfig => {
  const item =
    equipment.find((entry) => entry.slug === slug) ??
    baits.find((entry) => entry.slug === slug);
  if (!item) throw new Error(`Unknown shop item ${slug}`);
  const isBait = item.kind === 'BAIT';
  const grantQuantity = input.grantQuantity ?? (isBait ? 10 : 1);
  return {
    id: stableId(suffix),
    slug: isBait ? `${slug}-pack` : slug,
    name: isBait ? `${item.name} ×${grantQuantity}` : item.name,
    description:
      input.description ??
      (isBait
        ? 'Một phần mồi được dùng cho mỗi lượt thả câu.'
        : `Lực kéo ${(item as EquipmentConfig).power}, kiểm soát ${(item as EquipmentConfig).control}.`),
    kind: item.kind,
    imageKey: item.imageKey,
    priceGold: input.priceGold,
    grantQuantity,
    minLevel: item.minLevel,
    itemId: item.id,
    locationIds: input.locationIds ?? [],
    ...(input.sellPriceGold ? { sellPriceGold: input.sellPriceGold } : {}),
  };
};
/**
 * General store (no locationIds) plus terrain shops. Sell prices are per owned unit and
 * always below the purchase price per unit; the starter worm is never bought back so the
 * daily bait rescue cannot become a Gold faucet. Balance numbers are hypotheses to measure.
 */
export const shopItems: ShopConfig[] = [
  offer(501, 'bamboo-rod', { priceGold: '120', sellPriceGold: '40' }),
  offer(502, 'composite-rod', { priceGold: '360', sellPriceGold: '140' }),
  offer(503, 'worm', { priceGold: '30' }),
  offer(504, 'corn', { priceGold: '30', sellPriceGold: '1' }),
  offer(505, 'bran', { priceGold: '30', sellPriceGold: '1' }),
  offer(506, 'snail', {
    priceGold: '40',
    sellPriceGold: '2',
    locationIds: at('song-dao', 'cua-song-nuoc-lo'),
    description: 'Mồi ốc cho cá đáy sông và cá nước lợ.',
  }),
  offer(507, 'minnow', {
    priceGold: '50',
    sellPriceGold: '3',
    locationIds: at('song-dao', 'dam-rung-sau'),
    description: 'Cá mồi sống hấp dẫn các loài săn mồi.',
  }),
  offer(508, 'cricket', {
    priceGold: '40',
    sellPriceGold: '2',
    locationIds: at('suoi-da-may', 'dam-rung-sau'),
    description: 'Dế mèn bắt ven rừng, hợp cá suối và cá đầm.',
  }),
  offer(509, 'shrimp', {
    priceGold: '50',
    sellPriceGold: '3',
    locationIds: at('cua-song-nuoc-lo', 'ghenh-bien-gio'),
    description: 'Tôm sống giữ trong xô nước lợ, mồi tốt nhất cho cá ven biển.',
  }),
  offer(510, 'squid', {
    priceGold: '60',
    sellPriceGold: '3',
    locationIds: at('ghenh-bien-gio'),
    description: 'Mực cắt khúc bền mồi, dụ cá biển lớn.',
  }),
  offer(511, 'river-rod', {
    priceGold: '240',
    sellPriceGold: '90',
    locationIds: at('song-dao'),
  }),
  offer(512, 'stream-rod', {
    priceGold: '240',
    sellPriceGold: '90',
    locationIds: at('suoi-da-may'),
  }),
  offer(513, 'swamp-rod', {
    priceGold: '420',
    sellPriceGold: '160',
    locationIds: at('dam-rung-sau'),
  }),
  offer(514, 'surf-rod', {
    priceGold: '600',
    sellPriceGold: '240',
    locationIds: at('ghenh-bien-gio'),
  }),
  offer(515, 'fluoro-line', {
    priceGold: '160',
    sellPriceGold: '60',
    locationIds: at('suoi-da-may', 'song-dao'),
    description: 'Dây gần như vô hình trong nước trong. Kiểm soát +2.',
  }),
  offer(516, 'braided-line', {
    priceGold: '240',
    sellPriceGold: '90',
    locationIds: at('cua-song-nuoc-lo', 'ghenh-bien-gio'),
    description: 'Dây bện chịu cọ đá và hà. Lực kéo +2, kiểm soát +1.',
  }),
  offer(517, 'circle-hook', {
    priceGold: '120',
    sellPriceGold: '40',
    locationIds: at('song-dao', 'suoi-da-may', 'cua-song-nuoc-lo'),
    description: 'Lưỡi tròn ít tuột cá. Kiểm soát +1.',
  }),
  offer(518, 'saltwater-hook', {
    priceGold: '180',
    sellPriceGold: '70',
    locationIds: at('ghenh-bien-gio'),
    description: 'Thép không gỉ cho nước mặn. Lực kéo +1, kiểm soát +1.',
  }),
];
export const missions: MissionConfig[] = [
  {
    id: stableId(601),
    slug: 'daily-catch-3',
    name: 'Khởi đầu thuận lợi',
    description: 'Bắt thành công 3 con cá trong ngày.',
    metric: 'CATCH_COUNT',
    target: 3,
    rewardGold: '40',
    rewardXp: 20,
  },
  {
    id: stableId(602),
    slug: 'daily-species-2',
    name: 'Khám phá mặt hồ',
    description: 'Bắt 2 loài cá khác nhau trong ngày.',
    metric: 'SPECIES_COUNT',
    target: 2,
    rewardGold: '35',
    rewardXp: 20,
  },
  {
    id: stableId(603),
    slug: 'daily-weight-5kg',
    name: 'Một giỏ cá đầy',
    description: 'Tổng trọng lượng cá bắt trong ngày đạt 5 kg.',
    metric: 'TOTAL_WEIGHT_G',
    target: 5000,
    rewardGold: '45',
    rewardXp: 25,
  },
];
export const achievements: AchievementConfig[] = [
  {
    id: stableId(701),
    slug: 'first-catch',
    name: 'Cá đầu tay',
    description: 'Bắt thành công con cá đầu tiên.',
    metric: 'CATCH_COUNT',
    target: 1,
  },
  {
    id: stableId(702),
    slug: 'collector-5',
    name: 'Người khám phá',
    description: 'Sưu tập 5 loài cá khác nhau.',
    metric: 'SPECIES_COUNT',
    target: 5,
  },
  {
    id: stableId(703),
    slug: 'fisher-10',
    name: 'Tay câu bền bỉ',
    description: 'Bắt thành công 10 con cá.',
    metric: 'CATCH_COUNT',
    target: 10,
  },
];
export const DEFAULT_CONFIG: GameConfig = {
  version: 1,
  fish: fishSpecies,
  locations,
  equipment,
  baits,
  shop: shopItems,
  missions,
  achievements,
};
export const defaultConfig = DEFAULT_CONFIG;
export const configVersion = DEFAULT_CONFIG.version;
export const STARTER_GOLD = 200;
export const STARTER_WORMS = 20;
/** Trial balance: virtual items only; rate is snapshotted when a session starts. */
export const FISH_EXCHANGE_RATE_BPS = 1000;
export const FISH_EXCHANGE_DAILY_CAP = 100n;
export const UPGRADE_PRICES = [100, 250] as const;
export const IDS = {
  lake: stableId(201),
  woodRod: stableId(301),
  bambooRod: stableId(302),
  compositeRod: stableId(303),
  line: stableId(304),
  hook: stableId(305),
  worm: stableId(401),
  corn: stableId(402),
  bran: stableId(403),
  river: stableId(202),
  stream: stableId(203),
  forest: stableId(204),
  brackish: stableId(205),
  coast: stableId(206),
  shrimp: stableId(407),
  squid: stableId(408),
} as const;
export const offerLocationIds = (item: Pick<ShopConfig, 'locationIds'>) =>
  item.locationIds ?? [];

export function toPublicFish(fish: FishConfig): FishDto {
  return {
    id: fish.id,
    slug: fish.slug,
    name: fish.name,
    description: fish.description,
    imageKey: fish.imageKey,
    rarity: fish.rarity,
    minWeightG: fish.minWeightG,
    maxWeightG: fish.maxWeightG,
    habitat: fish.habitat,
    // Configs published before ecology data only held freshwater lake species.
    scientificName: fish.scientificName ?? fish.name,
    waterTypes: fish.waterTypes ?? ['FRESH'],
  };
}
export function toPublicLocation(
  location: LocationConfig,
  level = 1,
): LocationDto {
  return {
    id: location.id,
    slug: location.slug,
    name: location.name,
    description: location.description,
    imageKey: location.imageKey,
    minLevel: location.minLevel,
    entryFeeGold: location.entryFeeGold,
    environment: location.environment,
    unlocked: level >= location.minLevel,
  };
}

const id = z.uuid();
const gold = z.string().regex(/^(0|[1-9]\d{0,8})$/);
const named = {
  id,
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
};
const itemBase = {
  ...named,
  imageKey: z.string().min(1).max(150),
  minLevel: z.number().int().min(1).max(1000),
};
const metric = z.enum(['CATCH_COUNT', 'SPECIES_COUNT', 'TOTAL_WEIGHT_G']);
export const gameConfigSchema = z
  .strictObject({
    version: z.number().int().positive(),
    fish: z.array(fishConfigSchema).min(1).max(1000),
    locations: z
      .array(
        z.strictObject({
          ...itemBase,
          description: z.string().max(500),
          entryFeeGold: gold,
          environment: z.enum(environments),
          fishIds: z.array(id).min(1).max(1000),
          water: waterProfileSchema.optional(),
        }),
      )
      .min(1)
      .max(100),
    equipment: z
      .array(
        z.strictObject({
          ...itemBase,
          kind: z.enum(['ROD', 'LINE', 'HOOK']),
          slot: z.enum(['ROD', 'LINE', 'HOOK']),
          power: z.number().min(0).max(50),
          control: z.number().min(0).max(50),
        }),
      )
      .min(3)
      .max(1000),
    baits: z
      .array(z.strictObject({ ...itemBase, kind: z.literal('BAIT') }))
      .min(1)
      .max(1000),
    shop: z
      .array(
        z.strictObject({
          ...itemBase,
          description: z.string().max(500),
          kind: z.enum(itemKinds),
          priceGold: gold,
          grantQuantity: z.number().int().min(1).max(10000),
          itemId: id,
          locationIds: z.array(id).max(100).optional(),
          sellPriceGold: gold.optional(),
        }),
      )
      .max(1000),
    missions: z
      .array(
        z.strictObject({
          ...named,
          description: z.string().max(500),
          metric,
          target: z.number().int().positive().max(10000000),
          rewardGold: gold,
          rewardXp: z.number().int().min(0).max(10000),
        }),
      )
      .max(100),
    achievements: z
      .array(
        z.strictObject({
          ...named,
          description: z.string().max(500),
          metric,
          target: z.number().int().positive().max(10000000),
        }),
      )
      .max(1000),
  })
  .superRefine((config, context) => {
    for (const key of [
      'fish',
      'locations',
      'equipment',
      'baits',
      'shop',
      'missions',
      'achievements',
    ] as const) {
      const values = config[key];
      if (
        new Set(values.map((entry) => entry.id)).size !== values.length ||
        new Set(values.map((entry) => entry.slug)).size !== values.length
      )
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'ID và slug phải duy nhất trong danh mục',
        });
    }
    const fishById = new Map(config.fish.map((fish) => [fish.id, fish]));
    for (const [index, location] of config.locations.entries()) {
      if (
        location.fishIds.some((fishId) => !fishById.has(fishId)) ||
        location.fishIds.reduce(
          (sum, fishId) => sum + (fishById.get(fishId)?.spawnWeight ?? 0),
          0,
        ) <= 0
      )
        context.addIssue({
          code: 'custom',
          path: ['locations', index, 'fishIds'],
          message: 'Pool hồ phải tham chiếu cá hợp lệ và có trọng số dương',
        });
      const water = environmentWater[location.environment];
      const misplaced = location.fishIds.filter(
        (fishId) => !fishById.get(fishId)?.waterTypes.includes(water),
      );
      if (misplaced.length)
        context.addIssue({
          code: 'custom',
          path: ['locations', index, 'fishIds'],
          message: `Cá không sống được ở môi trường ${location.environment}: ${misplaced
            .map((fishId) => fishById.get(fishId)?.slug ?? fishId)
            .join(', ')}`,
        });
      if (
        !location.fishIds.some((fishId) => {
          const fish = fishById.get(fishId);
          return fish && fish.difficulty <= 25 && fish.spawnWeight > 0;
        })
      )
        context.addIssue({
          code: 'custom',
          path: ['locations', index, 'fishIds'],
          message: 'Mỗi điểm câu cần ít nhất một loài dễ cho người chơi mới',
        });
    }
    const locationIds = new Set(config.locations.map((l) => l.id));
    for (const [index, item] of config.shop.entries()) {
      if ((item.locationIds ?? []).some((l) => !locationIds.has(l)))
        context.addIssue({
          code: 'custom',
          path: ['shop', index, 'locationIds'],
          message: 'Tiệm địa phương phải thuộc điểm câu hợp lệ',
        });
      if (
        item.sellPriceGold !== undefined &&
        (BigInt(item.sellPriceGold) <= 0n ||
          BigInt(item.sellPriceGold) * BigInt(item.grantQuantity) >=
            BigInt(item.priceGold))
      )
        context.addIssue({
          code: 'custom',
          path: ['shop', index, 'sellPriceGold'],
          message: 'Giá thu mua phải dương và thấp hơn giá bán mỗi đơn vị',
        });
    }
    const itemById = new Map(
      [...config.equipment, ...config.baits].map((item) => [item.id, item]),
    );
    for (const [index, item] of config.shop.entries())
      if (itemById.get(item.itemId)?.kind !== item.kind)
        context.addIssue({
          code: 'custom',
          path: ['shop', index, 'itemId'],
          message: 'Vật phẩm shop không tồn tại hoặc sai kind',
        });
    for (const [index, item] of config.equipment.entries())
      if (item.kind !== item.slot)
        context.addIssue({
          code: 'custom',
          path: ['equipment', index, 'slot'],
          message: 'Slot không phù hợp kind',
        });
    const baitSlugs = new Set(config.baits.map((bait) => bait.slug));
    for (const [index, fish] of config.fish.entries())
      if (fish.preferredBaits.some((bait) => !baitSlugs.has(bait)))
        context.addIssue({
          code: 'custom',
          path: ['fish', index, 'preferredBaits'],
          message: 'Mồi không tồn tại',
        });
    for (const slot of ['ROD', 'LINE', 'HOOK'] as const)
      if (
        !config.equipment.some(
          (item) => item.slot === slot && item.minLevel === 1,
        )
      )
        context.addIssue({
          code: 'custom',
          path: ['equipment'],
          message: `Cần có ${slot} cấp 1 cho người mới`,
        });
    const worm = config.baits.find((bait) => bait.slug === 'worm');
    if (
      worm &&
      config.shop.some(
        (item) => item.itemId === worm.id && item.sellPriceGold !== undefined,
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['shop'],
        message:
          'Không thu mua giun starter để mồi cứu trợ không thành nguồn Gold',
      });
    if (!worm || worm.minLevel !== 1)
      context.addIssue({
        code: 'custom',
        path: ['baits'],
        message: 'Giun starter phải tồn tại và mở từ cấp 1',
      });
    if (
      !worm ||
      !config.shop.some(
        (item) =>
          item.itemId === worm.id &&
          item.kind === 'BAIT' &&
          item.priceGold === '30' &&
          item.grantQuantity === 10 &&
          item.minLevel === 1 &&
          !item.locationIds?.length,
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['shop'],
        message:
          'Giữ gói giun 10 con giá 30 Gold cấp 1 để chính sách cứu trợ hoạt động',
      });
    if (
      !config.locations.some(
        (location) =>
          location.minLevel === 1 &&
          location.entryFeeGold === '0' &&
          location.fishIds.some((fishId) => {
            const fish = fishById.get(fishId);
            return (
              fish &&
              fish.rarity === 'COMMON' &&
              fish.difficulty <= 25 &&
              fish.spawnWeight > 0
            );
          }),
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['locations'],
        message:
          'Cần hồ miễn phí cấp 1 có cá thường dễ và trọng số dương cho tutorial',
      });
  });

const catalogKeys = [
  'fish',
  'locations',
  'equipment',
  'baits',
  'shop',
  'missions',
  'achievements',
] as const;
export type CatalogKey = (typeof catalogKeys)[number];
/**
 * Additive upgrade of a live configuration with newer built-in content.
 * Existing entries keep every admin-edited value and only gain fields they lack;
 * default entries are appended unless their id is new to the live config and not
 * listed in `retired` (definitions an operator already removed). Returns null when
 * nothing changes. The caller assigns the next version and publishes normally.
 */
export function mergeMissingDefaults(
  live: GameConfig,
  defaults: GameConfig = DEFAULT_CONFIG,
  retired: Partial<Record<CatalogKey, ReadonlySet<string>>> = {},
): Omit<GameConfig, 'version'> | null {
  let changed = false;
  const next = structuredClone(live) as unknown as Record<
    CatalogKey,
    Array<Record<string, unknown>>
  >;
  for (const key of catalogKeys) {
    const entries = next[key];
    const byId = new Map(entries.map((entry) => [entry.id as string, entry]));
    for (const fallback of defaults[key] as unknown as Array<
      Record<string, unknown>
    >) {
      const current = byId.get(fallback.id as string);
      if (current) {
        for (const [field, value] of Object.entries(fallback))
          if (!(field in current)) {
            current[field] = structuredClone(value);
            changed = true;
          }
      } else if (!retired[key]?.has(fallback.id as string)) {
        entries.push(structuredClone(fallback));
        changed = true;
      }
    }
  }
  if (!changed) return null;
  const { version: _version, ...rest } = {
    ...live,
    ...(next as unknown as Omit<GameConfig, 'version'>),
  };
  return rest;
}
