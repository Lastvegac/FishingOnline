import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  fishSpecies,
  gameConfigSchema,
  IDS,
  mergeMissingDefaults,
  toPublicFish,
} from '@fwo/game-config';
import { environmentWater } from '@fwo/contracts';
import type { FishConfig } from '@fwo/game-config';
import {
  advanceEngine,
  castEngine,
  createEngine,
  EngineError,
  finishEngine,
  hookEngine,
  levelForXp,
  reelEngine,
  rewardForCatch,
  sampleWeight,
  selectFish,
  toPublicEngine,
  upgradeCost,
  weightedFishPool,
  xpForLevel,
} from './index.js';
import type { EngineState } from './index.js';

function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function fresh(
  fish: FishConfig = fishSpecies[2],
  tutorial = false,
): EngineState {
  return createEngine({
    now: 0,
    locationId: DEFAULT_CONFIG.locations[0].id,
    fishPool: [fish],
    baitSlug: 'worm',
    rodPower: 4,
    rodControl: 3,
    playerLevel: 1,
    configVersion: 1,
    tutorial,
  });
}
function fighting(fish: FishConfig = fishSpecies[2]): EngineState {
  let state = castEngine(
    fresh(fish),
    { now: 0, aim: 0.5, power: 0.7 },
    () => 0.4,
  );
  state = hookEngine(state, state.biteAt! + 100);
  return advanceEngine(state, state.hookEndsAt!);
}
function catchWithNormalControl(fish: FishConfig): EngineState {
  let state = fighting(fish),
    now = state.updatedAt;
  for (let i = 0; i < 190 && !state.outcome; i += 1) {
    state = advanceEngine(state, now);
    if (state.outcome) break;
    state = reelEngine(state, state.tension >= 70 ? 'release' : 'hold', now);
    now += 250;
  }
  return state;
}

describe('configuration and probability', () => {
  it('validates all starter data, FK relationships and the Hồ Sen ten-fish pool', () => {
    const parsed = gameConfigSchema.parse(DEFAULT_CONFIG);
    expect(parsed.fish.length).toBeGreaterThanOrEqual(30);
    expect(parsed.locations[0].fishIds).toHaveLength(10);
    const invalid = structuredClone(DEFAULT_CONFIG);
    invalid.locations[0].fishIds = ['00000000-0000-4000-8000-000000000999'];
    expect(gameConfigSchema.safeParse(invalid).success).toBe(false);
    const empty = structuredClone(DEFAULT_CONFIG);
    for (const fish of empty.fish) fish.spawnWeight = 0;
    expect(gameConfigSchema.safeParse(empty).success).toBe(false);
  });
  it('normalizes effective probabilities and bait changes the distribution', () => {
    const base = { baitSlug: 'worm', playerLevel: 1, rodPower: 4, hourUtc: 5 };
    const worm = weightedFishPool(fishSpecies, base),
      corn = weightedFishPool(fishSpecies, { ...base, baitSlug: 'corn' });
    expect(worm.reduce((total, row) => total + row.probability, 0)).toBeCloseTo(
      1,
      12,
    );
    expect(
      corn.find((row) => row.fish.slug === 'grass-carp')!.probability,
    ).toBeGreaterThan(
      worm.find((row) => row.fish.slug === 'grass-carp')!.probability,
    );
    expect(() =>
      weightedFishPool(
        fishSpecies.map((fish) => ({ ...fish, spawnWeight: 0 })),
        base,
      ),
    ).toThrow(EngineError);
  });
  it('rejects published configurations that strand starter players', () => {
    const missingWorm = structuredClone(DEFAULT_CONFIG);
    missingWorm.baits[0].minLevel = 2;
    expect(gameConfigSchema.safeParse(missingWorm).success).toBe(false);
    const lockedGear = structuredClone(DEFAULT_CONFIG);
    for (const item of lockedGear.equipment)
      if (item.slot === 'HOOK') item.minLevel = 2;
    expect(gameConfigSchema.safeParse(lockedGear).success).toBe(false);
    const noFreeLake = structuredClone(DEFAULT_CONFIG);
    noFreeLake.locations[0].entryFeeGold = '1';
    expect(gameConfigSchema.safeParse(noFreeLake).success).toBe(false);
    const noEasyFish = structuredClone(DEFAULT_CONFIG);
    for (const fish of noEasyFish.fish) fish.difficulty = 30;
    expect(gameConfigSchema.safeParse(noEasyFish).success).toBe(false);
    const noAffordableWorm = structuredClone(DEFAULT_CONFIG);
    noAffordableWorm.shop.find((item) => item.slug === 'worm-pack')!.priceGold =
      '40';
    expect(gameConfigSchema.safeParse(noAffordableWorm).success).toBe(false);
  });
  it('stocks every spot only with species that live in its water', () => {
    const byId = new Map(DEFAULT_CONFIG.fish.map((fish) => [fish.id, fish]));
    expect(new Set(DEFAULT_CONFIG.locations.map((l) => l.environment))).toEqual(
      new Set([
        'FRESHWATER_LAKE',
        'RIVER',
        'STREAM',
        'DEEP_FOREST',
        'BRACKISH',
        'COAST',
      ]),
    );
    for (const location of DEFAULT_CONFIG.locations)
      for (const fishId of location.fishIds)
        expect(byId.get(fishId)!.waterTypes).toContain(
          environmentWater[location.environment],
        );
    const carp = DEFAULT_CONFIG.fish.find((fish) => fish.slug === 'carp')!;
    const scad = DEFAULT_CONFIG.fish.find((f) => f.slug === 'round-scad')!;
    const carpAtSea = structuredClone(DEFAULT_CONFIG);
    carpAtSea.locations.find((l) => l.id === IDS.coast)!.fishIds.push(carp.id);
    expect(gameConfigSchema.safeParse(carpAtSea).success).toBe(false);
    const scadInLake = structuredClone(DEFAULT_CONFIG);
    scadInLake.locations[0].fishIds.push(scad.id);
    expect(gameConfigSchema.safeParse(scadInLake).success).toBe(false);
  });
  it('keeps terrain shop offers scoped, below purchase price and the worm unsellable', () => {
    for (const item of DEFAULT_CONFIG.shop)
      if (item.sellPriceGold)
        expect(
          BigInt(item.sellPriceGold) * BigInt(item.grantQuantity),
        ).toBeLessThan(BigInt(item.priceGold));
    expect(
      DEFAULT_CONFIG.shop.find((i) => i.slug === 'squid-pack')!.locationIds,
    ).toEqual([IDS.coast]);
    const wormFaucet = structuredClone(DEFAULT_CONFIG);
    wormFaucet.shop.find((i) => i.slug === 'worm-pack')!.sellPriceGold = '1';
    expect(gameConfigSchema.safeParse(wormFaucet).success).toBe(false);
    const arbitrage = structuredClone(DEFAULT_CONFIG);
    arbitrage.shop.find((i) => i.slug === 'shrimp-pack')!.sellPriceGold = '7';
    expect(gameConfigSchema.safeParse(arbitrage).success).toBe(false);
    const ghostSpot = structuredClone(DEFAULT_CONFIG);
    ghostSpot.shop.find((i) => i.slug === 'squid-pack')!.locationIds = [
      '00000000-0000-4000-8000-000000000999',
    ];
    expect(gameConfigSchema.safeParse(ghostSpot).success).toBe(false);
  });
  it('merges missing built-in content without overriding live edits or retired entries', () => {
    const legacy = structuredClone(DEFAULT_CONFIG);
    legacy.fish = legacy.fish.slice(0, 10).map((fish) => {
      const { scientificName: _s, waterTypes: _w, ...rest } = fish;
      return { ...rest, name: `${fish.name} (admin)` } as typeof fish;
    });
    legacy.locations = legacy.locations.slice(0, 1);
    legacy.shop = legacy.shop.slice(0, 5).map((item) => {
      const { locationIds: _l, sellPriceGold: _p, ...rest } = item;
      return rest;
    });
    const merged = mergeMissingDefaults(legacy, DEFAULT_CONFIG, {
      locations: new Set([IDS.river]),
    })!;
    expect(merged.fish).toHaveLength(DEFAULT_CONFIG.fish.length);
    expect(merged.fish[0].name).toBe('Cá chép (admin)');
    expect(merged.fish[0].waterTypes).toEqual(['FRESH']);
    expect(merged.locations.map((l) => l.id)).not.toContain(IDS.river);
    expect(merged.shop[1].sellPriceGold).toBe('140');
    expect(mergeMissingDefaults(DEFAULT_CONFIG, DEFAULT_CONFIG)).toBeNull();
    const withoutRiver = { ...merged, version: 2 };
    // River-only offers point at a retired spot, so the operator must review them.
    expect(gameConfigSchema.safeParse(withoutRiver).success).toBe(false);
  });
  it('samples rarity weights within five sigma with a reproducible 100k seed', () => {
    // Expected shares below are calibrated for the Hồ Sen starter pool.
    const pool = fishSpecies.slice(0, 10).map((fish) => ({
      ...fish,
      preferredBaits: ['uniform'],
    }));
    const random = seeded(271828),
      count = new Map<string, number>();
    const n = 100000;
    for (let i = 0; i < n; i += 1) {
      const fish = selectFish(
        pool,
        { baitSlug: 'uniform', playerLevel: 1, rodPower: 4, hourUtc: 5 },
        random,
      );
      count.set(fish.rarity, (count.get(fish.rarity) ?? 0) + 1);
    }
    for (const [rarity, p] of [
      ['COMMON', 0.55],
      ['UNCOMMON', 0.25],
      ['RARE', 0.13],
      ['EPIC', 0.05],
      ['LEGENDARY', 0.02],
    ] as const)
      expect(Math.abs((count.get(rarity) ?? 0) - n * p)).toBeLessThan(
        5 * Math.sqrt(n * p * (1 - p)),
      );
  });
  it('keeps triangular weight in integer bounds for every species and RNG boundaries', () => {
    const random = seeded(42);
    for (const fish of fishSpecies) {
      expect(sampleWeight(fish, () => 0)).toBe(fish.minWeightG);
      expect(sampleWeight(fish, () => 1 - Number.EPSILON)).toBe(
        fish.maxWeightG,
      );
      for (let i = 0; i < 1000; i += 1) {
        const weight = sampleWeight(fish, random);
        expect(Number.isInteger(weight)).toBe(true);
        expect(weight).toBeGreaterThanOrEqual(fish.minWeightG);
        expect(weight).toBeLessThanOrEqual(fish.maxWeightG);
      }
    }
    expect(() => sampleWeight(fishSpecies[0], () => 1)).toThrow(EngineError);
  });
  it('tutorial restricts easy species without changing public fish/reward contracts', () => {
    const weighted = weightedFishPool(fishSpecies, {
      baitSlug: 'worm',
      playerLevel: 1,
      rodPower: 4,
      tutorial: true,
    });
    expect(weighted.length).toBeGreaterThan(0);
    expect(weighted.every((row) => row.fish.difficulty <= 25)).toBe(true);
  });
  it('whitelists public species without spawn/reward/strength secrets', () => {
    const fish = toPublicFish(fishSpecies[0]);
    expect(fish.name).toBe('Cá chép');
    expect(fish).not.toHaveProperty('spawnWeight');
    expect(fish).not.toHaveProperty('baseRewardGold');
    expect(fish).not.toHaveProperty('pullStrength');
  });
});

describe('economy and progression', () => {
  it('calculates bounded integer reward and rejects client weight outside configuration', () => {
    const fish = fishSpecies[0];
    expect(rewardForCatch(fish, fish.baseWeightG)).toEqual({
      gold: 15,
      xp: 12,
    });
    expect(rewardForCatch(fish, fish.maxWeightG)).toEqual({ gold: 30, xp: 18 });
    expect(() => rewardForCatch(fish, fish.maxWeightG + 1)).toThrow(
      EngineError,
    );
    expect(() => rewardForCatch(fish, 301.5)).toThrow(EngineError);
  });
  it('uses exact level thresholds and cannot upgrade beyond +2', () => {
    expect([0, 99, 100, 399, 400, 899, 900].map(levelForXp)).toEqual([
      1, 1, 2, 2, 3, 3, 4,
    ]);
    expect(xpForLevel(5)).toBe(1600);
    expect(upgradeCost(0)).toBe(100);
    expect(upgradeCost(1)).toBe(250);
    expect(() => levelForXp(-1)).toThrow();
    expect(() => upgradeCost(2)).toThrow();
  });
});

describe('authoritative fishing lifecycle', () => {
  it('transitions idle,cast,waiting,bite,hooking,fighting and rejects early hook/complete', () => {
    const idle = fresh();
    expect(idle.state).toBe('IDLE');
    const cast = castEngine(idle, { now: 0, aim: 0.5, power: 0.7 }, () => 0.4);
    expect(idle.state).toBe('IDLE');
    expect(cast.state).toBe('CASTING');
    expect(advanceEngine(cast, 700).state).toBe('WAITING');
    expect(() => hookEngine(cast, 1000)).toThrow(EngineError);
    expect(() => finishEngine(cast, 1000)).toThrow(EngineError);
    const bite = advanceEngine(cast, cast.biteAt!);
    expect(bite.state).toBe('BITE');
    const hooked = hookEngine(bite, bite.biteAt! + 100);
    expect(hooked.state).toBe('HOOKING');
    expect(advanceEngine(hooked, hooked.hookEndsAt!).state).toBe('FIGHTING');
  });
  it('starter rod catches each common species using normal hold/release within fight limit', () => {
    for (const fish of fishSpecies.filter(
      (entry) => entry.rarity === 'COMMON',
    )) {
      const state = catchWithNormalControl(fish);
      expect(state.state, fish.slug).toBe('CAUGHT');
      expect(state.result?.fishId).toBe(fish.id);
      expect(state.updatedAt - state.fightStartedAt!).toBeLessThan(45000);
      const done = finishEngine(state, state.updatedAt);
      expect(done.state).toBe('FINISHED');
      expect(done.result).toEqual(state.result);
      expect(finishEngine(done, done.updatedAt)).toEqual(done);
    }
  });
  it('replaying cast or hook cannot start another fish', () => {
    const cast = castEngine(
      fresh(),
      { now: 0, aim: 0.5, power: 0.7 },
      () => 0.4,
    );
    expect(() =>
      castEngine(cast, { now: 0, aim: 0.5, power: 0.7 }, () => 0.8),
    ).toThrow(EngineError);
    const hooked = hookEngine(cast, cast.biteAt!);
    expect(() => hookEngine(hooked, hooked.updatedAt)).toThrow(EngineError);
  });
  it('missing hook escapes and never creates result', () => {
    const cast = castEngine(
      fresh(),
      { now: 0, aim: 0.5, power: 0.7 },
      () => 0.4,
    );
    const state = advanceEngine(cast, cast.hookDeadline! + 1);
    expect(state.state).toBe('ESCAPED');
    expect(state.escapeReason).toBe('MISSED_HOOK');
    expect(state.result).toBeUndefined();
    expect(finishEngine(state, state.updatedAt).state).toBe('FINISHED');
  });
  it('holds expire when disconnected and request spam or clock reversal is rejected', () => {
    let state = fighting();
    const now = state.updatedAt;
    state = reelEngine(state, 'hold', now);
    expect(() => reelEngine(state, 'hold', now + 249)).toThrow(EngineError);
    expect(() => advanceEngine(state, now - 1)).toThrow(EngineError);
    const after = advanceEngine(state, now + 3000);
    expect(after.tension).toBeLessThan(state.tension);
    expect(after.progress).toBeLessThan(30);
    expect(after.result).toBeUndefined();
  });
  it('continuous hold can break line; never treat complete as a win', () => {
    let state = fighting(),
      now = state.updatedAt;
    for (let i = 0; i < 100 && !state.outcome; i += 1) {
      state = advanceEngine(state, now);
      if (state.outcome) break;
      state = reelEngine(state, 'hold', now);
      now += 250;
    }
    expect(state.state).toBe('ESCAPED');
    expect(state.escapeReason).toBe('LINE_BROKE');
    expect(state.result).toBeUndefined();
  });
  it('caps absent client work and expires inactive sessions without reward', () => {
    const state = advanceEngine(fighting(), 86400000);
    expect(state.state).toBe('ESCAPED');
    expect(state.result).toBeUndefined();
    expect(state.escapeReason).toBe('FISH_TOO_FAR');
    expect(advanceEngine(fresh(), 60000).escapeReason).toBe('ABANDONED');
    expect(() =>
      castEngine(fresh(), { now: 60000, aim: 0.5, power: 0.5 }, () => 0.4),
    ).toThrow(EngineError);
  });
  it('preserves a legitimate catch within the last valid hold before a much later expiry', () => {
    const nearShore: EngineState = {
      ...fighting(),
      state: 'REELING',
      progress: 99,
      stamina: 0,
      tension: 20,
    };
    const held = reelEngine(nearShore, 'hold', nearShore.updatedAt);
    const recovered = advanceEngine(held, nearShore.updatedAt + 86400000);
    expect(recovered.state).toBe('CAUGHT');
    expect(recovered.result?.fishId).toBe(held.selectedFish!.id);
    expect(recovered.simulatedAt! - held.updatedAt).toBeLessThanOrEqual(350);
  });
  it('session config is snapshotted and future bite/seed/fish/result are not public', () => {
    const fish = structuredClone(fishSpecies[2]);
    const created = fresh(fish);
    fish.baseRewardGold = 999;
    expect(created.fishPool[0].baseRewardGold).not.toBe(999);
    const cast = castEngine(
      created,
      { now: 0, aim: 0.5, power: 0.5 },
      () => 0.4,
    );
    const publicState = toPublicEngine(cast, 0);
    for (const key of [
      'biteAt',
      'hookDeadline',
      'selectedFish',
      'selectedWeightG',
      'surgePhase',
      'fishPool',
      'result',
    ])
      expect(publicState).not.toHaveProperty(key);
    expect(
      toPublicEngine(advanceEngine(cast, cast.biteAt!), cast.biteAt!),
    ).toHaveProperty('hookDeadline');
  });
});
