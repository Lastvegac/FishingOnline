import type {
  EscapeReason,
  FishingState,
  ReelAction,
  SessionDto,
} from '@fwo/contracts';
import type { FishConfig } from '@fwo/game-config';
import { behaviorFor } from '@fwo/game-config';
import {
  createSimulator,
  ecologyScore,
  prepareSimulatorCast,
  scheduleBehavior,
  simulateFight,
  simulatorView,
} from './simulator.js';
import type { SimulatorSetup, SimulatorState } from './simulator.js';
export type { SimulatorSetup, SimulatorState } from './simulator.js';

export type RandomSource = () => number;
export const TICK_MS = 50;
export const REEL_SPACING_MS = 250;
export const HOLD_TTL_MS = 350;
export const SESSION_TTL_MS = 300000;
export const INACTIVITY_MS = 60000;
export const FIGHT_LIMIT_MS = 45000;
export class EngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}
export interface SelectionModifiers {
  baitSlug: string;
  playerLevel: number;
  rodPower: number;
  hourUtc?: number;
  /** Player-local hour (0–24); preferred over hourUtc, which assumes UTC+7. */
  localHour?: number;
  tutorial?: boolean;
  rarityMultipliers?: Partial<Record<FishConfig['rarity'], number>>;
}
export interface CreateEngineInput {
  now: number;
  locationId: string;
  fishPool: FishConfig[];
  baitSlug: string;
  rodPower: number;
  rodControl: number;
  playerLevel: number;
  configVersion: number;
  tutorial?: boolean;
  simulation?: SimulatorSetup;
}
export interface CatchResult {
  fishId: string;
  weightG: number;
  gold: number;
  xp: number;
  lengthCm?: number;
}
export interface EngineState {
  state: FishingState;
  version: number;
  createdAt: number;
  updatedAt: number;
  lastActionAt: number;
  locationId: string;
  configVersion: number;
  fishPool: FishConfig[];
  baitSlug: string;
  rodPower: number;
  rodControl: number;
  playerLevel: number;
  tutorial: boolean;
  tension: number;
  progress: number;
  stamina: number;
  held: boolean;
  holdUntil: number;
  lastReelAt: number;
  castEndsAt?: number;
  biteAt?: number;
  hookDeadline?: number;
  hookEndsAt?: number;
  fightStartedAt?: number;
  simulatedAt?: number;
  dangerMs: number;
  farMs: number;
  surgePhase: number;
  surgePeriodMs: number;
  selectedFish?: FishConfig;
  selectedWeightG?: number;
  result?: CatchResult;
  outcome?: 'CAUGHT' | 'ESCAPED';
  escapeReason?: EscapeReason;
  simulation?: SimulatorState;
}
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const assertFinite = (value: number, name: string) => {
  if (!Number.isFinite(value))
    throw new EngineError('INVALID_INPUT', `${name} không hợp lệ`);
};
function randomValue(random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new EngineError('INVALID_RANDOM', 'RNG phải thuộc [0,1)');
  return value;
}
function clone(state: EngineState): EngineState {
  return {
    ...state,
    ...(state.simulation
      ? { simulation: structuredClone(state.simulation) }
      : {}),
  };
}
function validateClock(state: EngineState, now: number): void {
  assertFinite(now, 'serverTime');
  if (now < state.updatedAt)
    throw new EngineError('INVALID_TIME', 'Đồng hồ server không được đi lùi');
}
export function levelForXp(totalXp: number): number {
  if (!Number.isSafeInteger(totalXp) || totalXp < 0)
    throw new EngineError('INVALID_XP', 'XP phải là số nguyên không âm');
  return 1 + Math.floor(Math.sqrt(totalXp / 100));
}
export const levelFromXp = levelForXp;
export function xpForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 100000)
    throw new EngineError('INVALID_LEVEL', 'Cấp độ không hợp lệ');
  return 100 * (level - 1) ** 2;
}
export function upgradeCost(currentLevel: number): number {
  if (currentLevel !== 0 && currentLevel !== 1)
    throw new EngineError('MAX_UPGRADE', 'Trang bị đã nâng cấp tối đa');
  return currentLevel === 0 ? 100 : 250;
}
export function rewardForCatch(
  fish: FishConfig,
  weightG: number,
): { gold: number; xp: number } {
  if (
    !Number.isSafeInteger(weightG) ||
    weightG < fish.minWeightG ||
    weightG > fish.maxWeightG
  )
    throw new EngineError('INVALID_WEIGHT', 'Trọng lượng ngoài cấu hình');
  const ratio = weightG / fish.baseWeightG;
  return {
    gold: Math.max(1, Math.floor(fish.baseRewardGold * clamp(ratio, 0.5, 2))),
    xp: Math.max(1, Math.floor(fish.baseXp * clamp(ratio, 0.75, 1.5))),
  };
}
export const calculateRewards = rewardForCatch;
export function weightedFishPool(
  pool: FishConfig[],
  modifiers: SelectionModifiers,
): Array<{ fish: FishConfig; weight: number; probability: number }> {
  if (pool.length === 0)
    throw new EngineError('EMPTY_FISH_POOL', 'Hồ không có cá hợp lệ');
  const eligible = modifiers.tutorial
    ? pool.filter((fish) => fish.difficulty <= 25)
    : pool;
  if (eligible.length === 0)
    throw new EngineError(
      'EMPTY_FISH_POOL',
      'Hồ không có cá phù hợp hướng dẫn',
    );
  const hour = modifiers.localHour ?? ((modifiers.hourUtc ?? 5) + 7) % 24;
  const twilight = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);
  const weighted = eligible.map((fish) => {
    const affinity = fish.preferredBaits.includes(modifiers.baitSlug)
      ? 1.4
      : 0.8;
    const timeFactor = twilight ? (fish.pullStrength >= 5 ? 1.15 : 0.95) : 1;
    const gearSuitability = clamp(
      1 + ((modifiers.rodPower - 4) * (fish.difficulty - 30)) / 2000,
      0.9,
      1.1,
    );
    const levelFactor = clamp(
      1 + ((modifiers.playerLevel - 1) * (fish.difficulty - 30)) / 4000,
      0.9,
      1.1,
    );
    const rarityFactor = modifiers.rarityMultipliers?.[fish.rarity] ?? 1;
    if (!Number.isFinite(rarityFactor) || rarityFactor < 0 || rarityFactor > 10)
      throw new EngineError('INVALID_CONFIG', 'Hệ số rarity không hợp lệ');
    const weight =
      fish.spawnWeight *
      affinity *
      timeFactor *
      gearSuitability *
      levelFactor *
      rarityFactor;
    if (!Number.isFinite(weight) || weight < 0)
      throw new EngineError('INVALID_CONFIG', 'Trọng số cá không hợp lệ');
    return { fish, weight, probability: 0 };
  });
  const total = weighted.reduce((sum, row) => sum + row.weight, 0);
  if (!Number.isFinite(total) || total <= 0)
    throw new EngineError('EMPTY_FISH_POOL', 'Tổng trọng số cá phải dương');
  return weighted.map((row) => ({ ...row, probability: row.weight / total }));
}
export function selectFish(
  pool: FishConfig[],
  modifiers: SelectionModifiers,
  random: RandomSource,
): FishConfig {
  const weighted = weightedFishPool(pool, modifiers);
  let remaining = randomValue(random);
  for (const row of weighted) {
    remaining -= row.probability;
    if (remaining < 0) return row.fish;
  }
  return weighted[weighted.length - 1].fish;
}
export function sampleWeight(fish: FishConfig, random: RandomSource): number {
  const { minWeightG: min, maxWeightG: max, baseWeightG: mode } = fish;
  if (min > mode || mode > max || min < 1)
    throw new EngineError(
      'INVALID_CONFIG',
      'Phân phối trọng lượng không hợp lệ',
    );
  if (min === max) return min;
  const u = randomValue(random),
    cutoff = (mode - min) / (max - min);
  const value =
    u < cutoff
      ? min + Math.sqrt(u * (max - min) * (mode - min))
      : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  return clamp(Math.round(value), min, max);
}
export function createEngine(input: CreateEngineInput): EngineState {
  assertFinite(input.now, 'serverTime');
  assertFinite(input.rodPower, 'rodPower');
  assertFinite(input.rodControl, 'rodControl');
  if (
    input.rodPower < 0 ||
    input.rodControl < 0 ||
    !Number.isInteger(input.playerLevel) ||
    input.playerLevel < 1
  )
    throw new EngineError('INVALID_INPUT', 'Trang bị hoặc level không hợp lệ');
  weightedFishPool(input.fishPool, {
    baitSlug: input.baitSlug,
    playerLevel: input.playerLevel,
    rodPower: input.rodPower,
    tutorial: input.tutorial,
  });
  return {
    ...input,
    simulation: input.simulation
      ? createSimulator(input.simulation)
      : undefined,
    fishPool: structuredClone(input.fishPool).map((fish) =>
      input.simulation
        ? { ...fish, behavior: fish.behavior ?? behaviorFor(fish.slug) }
        : fish,
    ),
    tutorial: input.tutorial ?? false,
    state: 'IDLE',
    version: 0,
    createdAt: input.now,
    updatedAt: input.now,
    lastActionAt: input.now,
    tension: 15,
    progress: 15,
    stamina: 100,
    held: false,
    holdUntil: 0,
    lastReelAt: -1,
    dangerMs: 0,
    farMs: 0,
    surgePhase: 0,
    surgePeriodMs: 3000,
  };
}
function escaped(state: EngineState, reason: EscapeReason): void {
  state.state = 'ESCAPED';
  state.outcome = 'ESCAPED';
  state.escapeReason = reason;
  state.held = false;
}
export function castEngine(
  state: EngineState,
  input: { now: number; aim: number; power: number; depth?: number },
  random: RandomSource,
): EngineState {
  validateClock(state, input.now);
  if (state.state !== 'IDLE')
    throw new EngineError('INVALID_STATE', 'Không thể thả câu lúc này');
  if (
    input.now - state.createdAt >= SESSION_TTL_MS ||
    input.now - state.lastActionAt >= INACTIVITY_MS
  )
    throw new EngineError('SESSION_EXPIRED', 'Phiên đã hết hạn');
  for (const [name, value] of Object.entries({
    aim: input.aim,
    power: input.power,
    depth: input.depth ?? 0.5,
  }))
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new EngineError('INVALID_INPUT', `${name} phải thuộc [0,1]`);
  const next = clone(state);
  if (next.simulation)
    prepareSimulatorCast(next, input.aim, input.power, input.depth ?? 0.5);
  const pool = next.simulation
    ? state.fishPool.map((fish) => ({
        ...fish,
        spawnWeight:
          fish.spawnWeight *
          ecologyScore(fish, next.simulation!, state.baitSlug),
      }))
    : state.fishPool;
  next.selectedFish = selectFish(
    pool,
    {
      baitSlug: state.baitSlug,
      playerLevel: state.playerLevel,
      rodPower: state.rodPower,
      hourUtc: new Date(input.now).getUTCHours(),
      // Conditions are snapshotted at session start in the player's local time zone.
      localHour: next.simulation?.conditions.hour,
      tutorial: state.tutorial,
    },
    random,
  );
  next.selectedWeightG = sampleWeight(next.selectedFish, random);
  next.state = 'CASTING';
  next.castEndsAt = input.now + 700;
  next.biteAt = next.castEndsAt + 3000 + Math.floor(randomValue(random) * 5000);
  next.hookDeadline =
    next.biteAt +
    Math.max(state.tutorial ? 3000 : 0, next.selectedFish.hookWindowMs) +
    150;
  next.surgePhase = randomValue(random) * Math.PI * 2;
  next.surgePeriodMs =
    next.selectedFish.surgeMinMs +
    randomValue(random) *
      (next.selectedFish.surgeMaxMs - next.selectedFish.surgeMinMs);
  if (next.simulation)
    scheduleBehavior(next, input.now, () => randomValue(random));
  next.lastActionAt = input.now;
  next.updatedAt = input.now;
  next.version += 1;
  return next;
}
function simulateTick(state: EngineState, tickAt: number): void {
  const fish = state.selectedFish!;
  const dt = TICK_MS / 1000;
  if (state.simulation) {
    const reason = simulateFight(state, tickAt, dt);
    if (reason) escaped(state, reason);
    else if (state.state === 'REELING' && state.progress >= 100)
      recordCatch(state);
    return;
  }
  const hold = state.held && tickAt <= state.holdUntil;
  const surge =
    (1 +
      Math.sin(
        ((tickAt - state.fightStartedAt!) * Math.PI * 2) / state.surgePeriodMs +
          state.surgePhase,
      )) /
    2;
  if (hold) {
    state.tension +=
      (12 + fish.pullStrength * 1.3 + surge * 10 - state.rodControl * 1.1) * dt;
    state.stamina -=
      Math.max(2, 12 + state.rodPower * 1.3 - fish.pullStrength * 0.8) * dt;
    state.progress +=
      Math.max(
        1,
        (state.state === 'REELING' ? 16 : 7) +
          state.rodPower * 0.7 -
          fish.pullStrength * 0.2 -
          surge * 2,
      ) * dt;
  } else {
    state.tension -= (26 + state.rodControl * 2) * dt;
    if (state.state !== 'REELING') state.stamina += dt;
    state.progress -= (1 + surge * 2) * dt;
  }
  state.tension = clamp(state.tension, 0, 100);
  state.progress = clamp(state.progress, 0, 100);
  state.stamina = clamp(state.stamina, 0, 100);
  state.dangerMs = state.tension > 95 ? state.dangerMs + TICK_MS : 0;
  state.farMs =
    state.progress === 0 && tickAt - state.fightStartedAt! > 3000
      ? state.farMs + TICK_MS
      : 0;
  if (state.dangerMs >= 800) escaped(state, 'LINE_BROKE');
  else if (state.farMs >= 6000) escaped(state, 'FISH_TOO_FAR');
  else if (tickAt - state.fightStartedAt! >= FIGHT_LIMIT_MS)
    escaped(state, 'TIMEOUT');
  else if (
    state.state === 'FIGHTING' &&
    state.stamina <= 0 &&
    state.progress >= 80
  )
    state.state = 'REELING';
  else if (state.state === 'REELING' && state.progress >= 100) {
    recordCatch(state);
  }
}
function recordCatch(state: EngineState): void {
  const fish = state.selectedFish!;
  state.state = 'CAUGHT';
  state.outcome = 'CAUGHT';
  state.held = false;
  if (state.simulation) state.simulation.distanceM = 0;
  state.result = {
    fishId: fish.id,
    weightG: state.selectedWeightG!,
    ...(state.simulation
      ? {
          lengthCm:
            Math.round(
              Math.cbrt(
                state.selectedWeightG! /
                  (fish.behavior ?? behaviorFor(fish.slug)).conditionFactor,
              ) * 10,
            ) / 10,
        }
      : {}),
    ...rewardForCatch(fish, state.selectedWeightG!),
  };
}
export function advanceEngine(state: EngineState, now: number): EngineState {
  validateClock(state, now);
  if (
    state.state === 'CAUGHT' ||
    state.state === 'ESCAPED' ||
    state.state === 'FINISHED'
  )
    return state;
  const next = clone(state);
  // Resolve legitimate earlier outcomes before applying a later inactivity expiry.
  // This preserves a catch completed within the final valid hold after disconnect.
  const expiresAt = Math.min(
    next.createdAt + SESSION_TTL_MS,
    next.lastActionAt + INACTIVITY_MS,
  );
  const effectiveNow = Math.min(now, expiresAt);
  if (next.state === 'CASTING' && effectiveNow >= next.castEndsAt!)
    next.state = 'WAITING';
  if (next.simulation && next.state === 'WAITING') {
    if (next.simulation.snagged) escaped(next, 'SNAGGED');
    else if (
      next.simulation.rejected &&
      effectiveNow >= next.simulation.refusedUntil
    )
      escaped(next, 'BAIT_REJECTED');
  }
  if (next.state === 'WAITING' && effectiveNow >= next.biteAt!)
    next.state = 'BITE';
  if (next.state === 'BITE' && effectiveNow > next.hookDeadline!)
    escaped(next, 'MISSED_HOOK');
  if (next.state === 'HOOKING' && effectiveNow >= next.hookEndsAt!) {
    next.state = 'FIGHTING';
    next.simulatedAt = next.hookEndsAt!;
    next.fightStartedAt = next.hookEndsAt!;
  }
  if (next.state === 'FIGHTING' || next.state === 'REELING') {
    // Bounded catch-up: 1500 ticks for simulator, 900 for legacy fights.
    const until = Math.min(
      effectiveNow,
      next.fightStartedAt! + (next.simulation ? 75000 : FIGHT_LIMIT_MS),
    );
    while (
      next.simulatedAt! + TICK_MS <= until &&
      (next.state === 'FIGHTING' || next.state === 'REELING')
    ) {
      next.simulatedAt! += TICK_MS;
      simulateTick(next, next.simulatedAt!);
    }
  }
  if (!next.outcome && now >= expiresAt) escaped(next, 'ABANDONED');
  if (next.state !== state.state || next.simulatedAt !== state.simulatedAt)
    next.version += 1;
  next.updatedAt = now;
  return next;
}
export function hookEngine(state: EngineState, now: number): EngineState {
  const next = clone(advanceEngine(state, now));
  if (next.simulation && next.state === 'WAITING') {
    escaped(next, 'EARLY_STRIKE');
    next.lastActionAt = now;
    next.version += 1;
    return next;
  }
  if (next.state !== 'BITE')
    throw new EngineError('INVALID_STATE', 'Chỉ giật cần khi cá đang cắn câu');
  next.state = 'HOOKING';
  if (next.simulation) {
    const window = next.hookDeadline! - next.biteAt!;
    const timing = (now - next.biteAt!) / window;
    next.simulation.hookQuality = next.tutorial
      ? 1
      : clamp(1 - Math.abs(timing - 0.3) * 0.7, 0.55, 1);
  }
  next.hookEndsAt = now + 250;
  next.lastActionAt = now;
  next.updatedAt = now;
  next.version += 1;
  return next;
}
export function reelEngine(
  state: EngineState,
  action: ReelAction,
  now: number,
  controls?: { drag?: number; rodAngle?: number },
): EngineState {
  const next = clone(advanceEngine(state, now));
  if (next.state !== 'FIGHTING' && next.state !== 'REELING')
    throw new EngineError('INVALID_STATE', 'Chưa thể kéo cá');
  if (action !== 'hold' && action !== 'release')
    throw new EngineError('INVALID_INPUT', 'Thao tác không hợp lệ');
  if (next.lastReelAt >= 0 && now - next.lastReelAt < REEL_SPACING_MS)
    throw new EngineError('ACTION_TOO_FAST', 'Thao tác quá nhanh');
  if (controls)
    for (const [name, value] of Object.entries(controls)) {
      if (
        value !== undefined &&
        (!Number.isFinite(value) ||
          value < (name === 'drag' ? 0 : -1) ||
          value > 1)
      )
        throw new EngineError('INVALID_INPUT', 'Điều khiển không hợp lệ');
    }
  if (next.simulation) {
    next.simulation.drag = controls?.drag ?? next.simulation.drag;
    next.simulation.rodAngle = controls?.rodAngle ?? next.simulation.rodAngle;
  }
  next.held = action === 'hold';
  next.holdUntil = action === 'hold' ? now + HOLD_TTL_MS : now;
  next.lastReelAt = now;
  next.lastActionAt = now;
  next.updatedAt = now;
  next.version += 1;
  return next;
}
export function finishEngine(state: EngineState, now: number): EngineState {
  const next = clone(advanceEngine(state, now));
  if (next.state === 'FINISHED') return next;
  if (next.state !== 'CAUGHT' && next.state !== 'ESCAPED')
    throw new EngineError('INVALID_STATE', 'Phiên chưa kết thúc');
  next.state = 'FINISHED';
  next.updatedAt = now;
  next.version += 1;
  return next;
}
export function abandonEngine(state: EngineState, now: number): EngineState {
  const next = clone(advanceEngine(state, now));
  if (!next.outcome) {
    escaped(next, 'ABANDONED');
    next.updatedAt = now;
    next.version += 1;
  }
  return next;
}
/** Whitelist projection. The caller attaches DB session ID and committed CatchDto. */
export function toPublicEngine(
  state: EngineState,
  now: number,
): Omit<SessionDto, 'id' | 'catch'> {
  const publicState: Omit<SessionDto, 'id' | 'catch'> = {
    state: state.state,
    version: state.version,
    serverTime: new Date(now).toISOString(),
    tension: Math.round(state.tension * 10) / 10,
    progress: Math.round(state.progress * 10) / 10,
    stamina: Math.round(state.stamina * 10) / 10,
    locationId: state.locationId,
    ...(state.simulation ? { simulator: simulatorView(state, now) } : {}),
  };
  if (state.state === 'BITE' && state.hookDeadline !== undefined)
    publicState.hookDeadline = new Date(state.hookDeadline).toISOString();
  if (state.escapeReason) publicState.escapeReason = state.escapeReason;
  return publicState;
}
