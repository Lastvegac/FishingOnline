import { z } from 'zod';
import type { Environment, WaterConditions } from '@fwo/contracts';

/** Optional on published content: older configs keep working without being rewritten. */
export const behaviorProfileSchema = z
  .strictObject({
    depthMin: z.number().min(0).max(1),
    depthMax: z.number().min(0).max(1),
    temperatureMinC: z.number().min(0).max(40),
    temperatureMaxC: z.number().min(0).max(45),
    activeHour: z.number().min(0).max(23),
    caution: z.number().min(0).max(1),
    speed: z.number().min(0.2).max(3),
    endurance: z.number().min(0.5).max(2),
    habitat: z.enum(['OPEN', 'REEDS', 'ROCKS', 'CHANNEL']),
    fightStyle: z.enum(['DASH', 'BOTTOM', 'WEAVE', 'SURFACE']),
    /** weightG = conditionFactor * lengthCm^3 (game approximation). */
    conditionFactor: z.number().min(0.002).max(0.1),
  })
  .refine(
    (p) => p.depthMin <= p.depthMax && p.temperatureMinC < p.temperatureMaxC,
    'Invalid ecology range',
  );
export type BehaviorProfile = z.infer<typeof behaviorProfileSchema>;

const bottom = new Set([
  'walking-catfish',
  'pangasius',
  'bagrid-catfish',
  'hemibagrus',
  'bagarius',
  'grouper',
  'giant-grouper',
  'river-goby',
  'stream-loach',
  'sillago',
]);
const predator = new Set([
  'snakehead',
  'giant-snakehead',
  'barramundi',
  'barracuda',
  'spanish-mackerel',
  'hampala',
  'featherback',
  'clown-featherback',
  'mangrove-snapper',
]);
const grazer = new Set([
  'grass-carp',
  'silver-carp',
  'giant-gourami',
  'snakeskin-gourami',
  'mullet',
  'spotted-scat',
]);
const fast = new Set([
  'round-scad',
  'spanish-mackerel',
  'barracuda',
  'mahseer',
  'spinibarbus',
]);

export function behaviorFor(slug: string): BehaviorProfile {
  const isBottom = bottom.has(slug),
    isPredator = predator.has(slug);
  const isFast = fast.has(slug),
    isGrazer = grazer.has(slug);
  // Stable species variation: no runtime RNG or shared identical fish profiles.
  const n = [...slug].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 7;
  return {
    depthMin: isBottom ? 0.4 : isGrazer ? 0.08 : 0.12,
    depthMax: isBottom ? 1 : isPredator ? 0.7 : 0.85,
    temperatureMinC: 16 + n * 0.5,
    temperatureMaxC: 31 + n * 0.4,
    activeHour: isBottom ? 21 : isPredator ? 6 : 17,
    caution: (isPredator ? 0.65 : isGrazer ? 0.5 : 0.3) + n * 0.02,
    speed:
      (isFast ? 1.7 : isPredator ? 1.3 : isBottom ? 0.65 : 0.85) + n * 0.04,
    endurance: (isBottom ? 1.4 : isFast ? 1.2 : 0.85) + n * 0.025,
    habitat: isBottom
      ? 'CHANNEL'
      : isPredator
        ? 'ROCKS'
        : isGrazer
          ? 'REEDS'
          : 'OPEN',
    fightStyle: isBottom
      ? 'BOTTOM'
      : isFast
        ? 'DASH'
        : isPredator
          ? 'SURFACE'
          : 'WEAVE',
    conditionFactor: isBottom
      ? 0.009
      : isFast
        ? 0.008
        : isPredator
          ? 0.011
          : 0.022,
  };
}

export const waterProfileSchema = z.strictObject({
  maxDepthM: z.number().min(1).max(100),
  temperatureC: z.number().min(5).max(38),
  clarity: z.number().min(0).max(1),
  currentMps: z.number().min(0).max(5),
  quality: z.number().min(0.1).max(1),
});
export type WaterProfile = z.infer<typeof waterProfileSchema>;
export const waterProfiles: Record<Environment, WaterProfile> = {
  FRESHWATER_LAKE: {
    maxDepthM: 5,
    temperatureC: 25,
    clarity: 0.65,
    currentMps: 0.08,
    quality: 0.9,
  },
  RIVER: {
    maxDepthM: 9,
    temperatureC: 24,
    clarity: 0.4,
    currentMps: 0.85,
    quality: 0.8,
  },
  STREAM: {
    maxDepthM: 3,
    temperatureC: 21,
    clarity: 0.92,
    currentMps: 1.1,
    quality: 0.96,
  },
  DEEP_FOREST: {
    maxDepthM: 6,
    temperatureC: 26,
    clarity: 0.3,
    currentMps: 0.04,
    quality: 0.75,
  },
  BRACKISH: {
    maxDepthM: 10,
    temperatureC: 27,
    clarity: 0.5,
    currentMps: 0.55,
    quality: 0.85,
  },
  COAST: {
    maxDepthM: 18,
    temperatureC: 25,
    clarity: 0.8,
    currentMps: 0.65,
    quality: 0.93,
  },
};

/** Vietnam (UTC+7): used when a request carries no valid time zone. */
export const DEFAULT_UTC_OFFSET_MINUTES = 420;

/**
 * Shared in-game weather, changes every 20 real minutes; authoritative time only.
 * `hour` is the player's real local clock (UTC + offset), so day/night and
 * twilight follow where the game is actually played.
 */
export function conditionsFor(
  environment: Environment,
  now: number,
  profile = waterProfiles[environment],
  utcOffsetMinutes = DEFAULT_UTC_OFFSET_MINUTES,
): WaterConditions {
  const hour =
    (((now / 3600000 + utcOffsetMinutes / 60) % 24) + 24) % 24;
  const period = Math.floor(now / 1200000);
  const offset = Object.keys(waterProfiles).indexOf(environment);
  const phase = (((period + offset * 3) % 12) + 12) % 12;
  const weather =
    phase === 0
      ? 'FOG'
      : phase === 7
        ? 'STORM'
        : phase >= 8
          ? 'RAIN'
          : phase >= 4
            ? 'CLOUDY'
            : 'CLEAR';
  const rain = weather === 'RAIN' || weather === 'STORM';
  const tidal = environment === 'COAST' || environment === 'BRACKISH';
  return {
    ...profile,
    environment,
    weather,
    hour,
    temperatureC:
      Math.round(
        (profile.temperatureC +
          Math.sin(((hour - 9) / 24) * Math.PI * 2) * 2 -
          (rain ? 1.5 : 0)) *
          10,
      ) / 10,
    clarity: Math.max(0.1, profile.clarity - (rain ? 0.15 : 0)),
    currentMps:
      Math.round(
        (profile.currentMps *
          (tidal
            ? 0.7 + 0.5 * Math.abs(Math.sin(((now / 3600000) * Math.PI) / 6.2))
            : 1) +
          (rain ? 0.1 : 0)) *
          100,
      ) / 100,
    windMps: weather === 'STORM' ? 12 : rain ? 5 : 1.5 + phase * 0.3,
    windDirection: Math.sin(period * 0.7 + offset),
  };
}

export const tackleProfileSchema = z.strictObject({
  rodLengthM: z.number().min(1).max(8),
  rodLoadKg: z.number().min(0.5).max(100),
  maxDragKg: z.number().min(0.2).max(50),
  lineStrengthKg: z.number().min(0.5).max(100),
  abrasionResistance: z.number().min(0).max(1),
  stretch: z.number().min(0).max(1),
  hookGrip: z.number().min(0.5).max(1.5),
});
export type TackleProfile = z.infer<typeof tackleProfileSchema>;
export function tackleFor(
  rod: { slug: string; power: number; control: number },
  lineSlug: string,
  hookSlug: string,
): TackleProfile {
  const braid = lineSlug === 'braided-line',
    fluoro = lineSlug === 'fluoro-line';
  return {
    rodLengthM:
      rod.slug === 'surf-rod'
        ? 4.5
        : rod.slug === 'stream-rod'
          ? 1.8
          : rod.slug === 'river-rod'
            ? 3.6
            : 2.7,
    rodLoadKg: 1.8 + rod.power * 0.9,
    maxDragKg: 0.8 + rod.power * 0.45,
    lineStrengthKg: braid ? 16 : fluoro ? 8 : 4.5,
    abrasionResistance: fluoro ? 0.9 : braid ? 0.65 : 0.4,
    stretch: braid ? 0.05 : fluoro ? 0.15 : 0.3,
    hookGrip:
      hookSlug === 'circle-hook'
        ? 1.25
        : hookSlug === 'saltwater-hook'
          ? 1.15
          : 1,
  };
}

export const baitMassG: Record<string, number> = {
  worm: 8,
  corn: 12,
  bran: 18,
  snail: 22,
  cricket: 5,
  minnow: 28,
  shrimp: 20,
  squid: 35,
};
