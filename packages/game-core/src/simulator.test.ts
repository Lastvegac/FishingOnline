import { describe, expect, it } from 'vitest';
import { sessionSchema } from '@fwo/contracts';
import {
  behaviorFor,
  conditionsFor,
  DEFAULT_CONFIG,
  fishSpecies,
  tackleFor,
} from '@fwo/game-config';
import type { FishConfig } from '@fwo/game-config';
import {
  advanceEngine,
  castEngine,
  createEngine,
  hookEngine,
  reelEngine,
  toPublicEngine,
} from './index.js';
import type { EngineState } from './index.js';
import { ecologyScore, solveCast } from './simulator.js';

const now = Date.UTC(2026, 10, 7, 5);
const carp = fishSpecies[0];
function fresh(fish: FishConfig = carp, tutorial = true) {
  return createEngine({
    now,
    locationId: DEFAULT_CONFIG.locations[0].id,
    fishPool: [fish],
    baitSlug: 'worm',
    rodPower: 4,
    rodControl: 3,
    playerLevel: 1,
    configVersion: 1,
    tutorial,
    simulation: {
      conditions: conditionsFor('FRESHWATER_LAKE', now),
      tackle: tackleFor(
        { slug: 'wood-rod', power: 4, control: 3 },
        'nylon-line',
        'basic-hook',
      ),
      rodSlug: 'wood-rod',
      lineSlug: 'nylon-line',
      hookSlug: 'basic-hook',
      baitMassG: 8,
    },
  });
}
function cast(state = fresh(), power = 0.6, aim = 0.5, depth = 0.5) {
  return castEngine(state, { now, aim, power, depth }, () => 0.4);
}
function fight(fish = carp): EngineState {
  const state = cast(fresh(fish));
  const hooked = hookEngine(state, state.biteAt! + 150);
  return advanceEngine(hooked, hooked.hookEndsAt!);
}
function controlled(state: EngineState) {
  for (let i = 0; i < 300 && !state.outcome; i++) {
    state = reelEngine(
      state,
      state.tension > 65 ? 'release' : 'hold',
      state.updatedAt,
      { drag: 0.55, rodAngle: -state.simulation!.fishDirection },
    );
    state = advanceEngine(state, state.updatedAt + 250);
  }
  return state;
}
describe('simulator ecology, casting and strike', () => {
  it('has distinct species profiles and bounded conditions for all six habitats', () => {
    expect(
      new Set(fishSpecies.map((f) => JSON.stringify(behaviorFor(f.slug)))).size,
    ).toBeGreaterThan(20);
    for (const location of DEFAULT_CONFIG.locations) {
      const conditions = conditionsFor(location.environment, now);
      expect(conditions).toEqual(conditionsFor(location.environment, now));
      expect(conditions.maxDepthM).toBeGreaterThan(0);
      expect(conditionsFor(location.environment, now + 1200000)).not.toEqual(
        conditions,
      );
    }
  });
  it('makes power, wind, rig mass and rod length affect the actual landing', () => {
    const sim = fresh().simulation!;
    expect(solveCast(sim, 0.5, 0.9, 0.5).distanceM).toBeGreaterThan(
      solveCast(sim, 0.5, 0.2, 0.5).distanceM,
    );
    const windy = structuredClone(sim);
    windy.conditions.windMps = 12;
    windy.conditions.windDirection = 1;
    expect(solveCast(windy, 0.5, 0.6, 0.5).aim).toBeGreaterThan(0.5);
    windy.baitMassG = 35;
    expect(solveCast(windy, 0.5, 0.6, 0.5).aim).toBeLessThan(
      solveCast({ ...windy, baitMassG: 5 }, 0.5, 0.6, 0.5).aim,
    );
  });
  it('uses bait, depth, temperature, active time and habitat instead of pure bite RNG', () => {
    const sim = cast().simulation!;
    const optimal = structuredClone(sim);
    const profile = behaviorFor(carp.slug);
    optimal.conditions.hour = profile.activeHour;
    optimal.conditions.temperatureC = 25;
    optimal.cast!.depthM =
      (optimal.conditions.maxDepthM * (profile.depthMin + profile.depthMax)) /
      2;
    optimal.cast!.habitat = profile.habitat;
    const score = ecologyScore(carp, optimal, carp.preferredBaits[0]);
    expect(score).toBeGreaterThan(ecologyScore(carp, optimal, 'squid'));
    expect(score).toBeGreaterThan(
      ecologyScore(
        carp,
        { ...optimal, conditions: { ...optimal.conditions, temperatureC: 5 } },
        carp.preferredBaits[0],
      ),
    );
    expect(score).toBeGreaterThan(
      ecologyScore(
        carp,
        {
          ...optimal,
          conditions: {
            ...optimal.conditions,
            hour: (profile.activeHour + 12) % 24,
          },
        },
        carp.preferredBaits[0],
      ),
    );
  });
  it('exposes observable inspect/feed/bite signals without future deadlines or fish identity', () => {
    const state = cast();
    expect(state.biteAt! - state.castEndsAt!).toBeGreaterThanOrEqual(4500);
    const inspect = advanceEngine(state, state.simulation!.inspectAt + 1);
    expect(toPublicEngine(inspect, inspect.updatedAt).simulator?.cue).toBe(
      'NUDGE',
    );
    const feed = advanceEngine(inspect, state.simulation!.feedingAt + 1);
    expect(toPublicEngine(feed, feed.updatedAt).simulator?.cue).toBe('DIP');
    const view = toPublicEngine(feed, feed.updatedAt);
    for (const field of [
      'biteAt',
      'selectedFish',
      'selectedWeightG',
      'fishPool',
      'result',
      'hookDeadline',
    ])
      expect(view).not.toHaveProperty(field);
    expect(view.simulator).not.toHaveProperty('suitability');
    sessionSchema.parse({ id: DEFAULT_CONFIG.locations[0].id, ...view });
    expect(advanceEngine(feed, state.biteAt!).state).toBe('BITE');
  });
  it('can reject bait, snag the bank, miss a bite or lose a fish by striking early', () => {
    const incompatible = fresh(carp, false);
    incompatible.baitSlug = 'squid';
    incompatible.simulation!.conditions.temperatureC = 5;
    const rejected = cast(incompatible, 0.6, 0.5, 0.01);
    expect(advanceEngine(rejected, rejected.biteAt!).escapeReason).toBe(
      'BAIT_REJECTED',
    );
    const bank = fresh();
    bank.simulation!.conditions.windMps = 0;
    const snag = cast(bank, 1, 0);
    expect(advanceEngine(snag, snag.castEndsAt!).escapeReason).toBe('SNAGGED');
    const state = cast();
    expect(hookEngine(state, state.castEndsAt! + 500).escapeReason).toBe(
      'EARLY_STRIKE',
    );
    expect(advanceEngine(state, state.hookDeadline! + 1).escapeReason).toBe(
      'MISSED_HOOK',
    );
  });
});
describe('simulator physics and server authority', () => {
  it('lands starter species through real control, records mass and a species-specific length', () => {
    for (const fish of fishSpecies
      .slice(0, 10)
      .filter((f) => f.rarity === 'COMMON')) {
      const state = controlled(fight(fish));
      expect(state.state, fish.slug).toBe('CAUGHT');
      expect(state.stamina).toBe(0);
      expect(state.result!.weightG).toBeGreaterThanOrEqual(fish.minWeightG);
      expect(state.result!.lengthCm).toBeGreaterThan(0);
      expect(state.simulation!.distanceM).toBe(0);
    }
  });
  it('changes forces with fish weight, line rating, drag and counter steering', () => {
    const base = fight();
    const tick = (state: EngineState, drag = 0.55, angle = 0) =>
      advanceEngine(
        reelEngine(state, 'hold', state.updatedAt, { drag, rodAngle: angle }),
        state.updatedAt + 250,
      );
    const heavy = structuredClone(base);
    heavy.selectedWeightG! *= 3;
    expect(tick(heavy).tension).toBeGreaterThan(tick(base).tension);
    const weak = structuredClone(base);
    weak.simulation!.tackle.lineStrengthKg = 1;
    expect(tick(weak).tension).toBeGreaterThan(tick(base).tension);
    expect(tick(base, 0.9).tension).toBeGreaterThan(tick(base, 0.2).tension);
    expect(tick(base, 0.55, -1).tension).not.toBe(tick(base, 0.55, 1).tension);
  });
  it('allows line break and slack escape, without granting a result', () => {
    let held = fight();
    for (let i = 0; i < 150 && !held.outcome; i++) {
      held = advanceEngine(
        reelEngine(held, 'hold', held.updatedAt, { drag: 1 }),
        held.updatedAt + 250,
      );
    }
    expect(held.escapeReason).toBe('LINE_BROKE');
    expect(held.result).toBeUndefined();
    const slack = advanceEngine(fight(), now + 55000);
    expect(['SLACK_LINE', 'FISH_TOO_FAR']).toContain(slack.escapeReason);
    expect(slack.result).toBeUndefined();
  });
  it('is invariant to polling frequency and caps disconnected hold; snapshots are immutable', () => {
    const state = reelEngine(fight(), 'hold', fight().updatedAt);
    const original = structuredClone(state);
    const once = advanceEngine(state, state.updatedAt + 2000);
    let frequent = state;
    for (let i = 1; i <= 20; i++)
      frequent = advanceEngine(frequent, state.updatedAt + i * 100);
    expect(frequent.tension).toBe(once.tension);
    expect(frequent.progress).toBe(once.progress);
    expect(state).toEqual(original);
    expect(once.stamina).toBeGreaterThan(80);
    expect(() =>
      reelEngine(state, 'hold', state.updatedAt + 250, { drag: Number.NaN }),
    ).toThrow();
  });
});

describe('local time of day', () => {
  it('reports the player-local hour from the UTC offset', () => {
    const noonUtc = Date.UTC(2026, 10, 7, 12);
    expect(conditionsFor('FRESHWATER_LAKE', noonUtc).hour).toBe(19);
    const berlin = conditionsFor('COAST', noonUtc, undefined, 60);
    expect(berlin.hour).toBe(13);
    expect(conditionsFor('RIVER', noonUtc, undefined, -300).hour).toBe(7);
  });
});
