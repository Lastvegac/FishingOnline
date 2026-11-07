import type {
  EscapeReason,
  SimulatorView,
  WaterConditions,
} from '@fwo/contracts';
import type {
  BehaviorProfile,
  FishConfig,
  TackleProfile,
} from '@fwo/game-config';
import { behaviorFor } from '@fwo/game-config';
import type { EngineState, RandomSource } from './index.js';

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export interface SimulatorSetup {
  conditions: WaterConditions;
  tackle: TackleProfile;
  rodSlug: string;
  lineSlug: string;
  hookSlug: string;
  baitMassG: number;
}
export interface SimulatorState extends SimulatorSetup {
  cast?: NonNullable<SimulatorView['cast']>;
  noise: number;
  suitability: number;
  approachAt: number;
  inspectAt: number;
  feedingAt: number;
  refusedUntil: number;
  rejected: boolean;
  snagged: boolean;
  drag: number;
  rodAngle: number;
  fishDirection: number;
  lineDurability: number;
  rodLoad: number;
  distanceM: number;
  slackMs: number;
  hookQuality: number;
}
export function createSimulator(setup: SimulatorSetup): SimulatorState {
  return {
    ...structuredClone(setup),
    noise: 0,
    suitability: 1,
    approachAt: 0,
    inspectAt: 0,
    feedingAt: 0,
    refusedUntil: 0,
    rejected: false,
    snagged: false,
    drag: 0.55,
    rodAngle: 0,
    fishDirection: 0,
    lineDurability: 100,
    rodLoad: 0,
    distanceM: 0,
    slackMs: 0,
    hookQuality: 1,
  };
}
export function solveCast(
  sim: SimulatorState,
  aim: number,
  power: number,
  depth: number,
) {
  const { conditions: c, tackle: gear } = sim;
  const flightMs = 700 + power * 500;
  const drift =
    (c.windMps * c.windDirection * flightMs) / 1000 / (65 + sim.baitMassG);
  const landedAim = clamp(aim + drift, 0, 1);
  const distanceM =
    Math.round(
      (3 + power * (12 + gear.rodLengthM * 5) + sim.baitMassG * 0.08) * 10,
    ) / 10;
  const habitat =
    landedAim < 0.22
      ? 'REEDS'
      : landedAim > 0.83
        ? 'ROCKS'
        : power > 0.7
          ? 'CHANNEL'
          : 'OPEN';
  const depthM =
    Math.round(clamp(depth * c.maxDepthM, 0.2, c.maxDepthM) * 10) / 10;
  return { aim: landedAim, distanceM, depthM, flightMs, habitat } as const;
}
export function ecologyScore(
  fish: FishConfig,
  sim: SimulatorState,
  bait: string,
): number {
  const p = fish.behavior ?? behaviorFor(fish.slug),
    c = sim.conditions;
  const depth = sim.cast!.depthM / c.maxDepthM;
  const depthScore = depth >= p.depthMin && depth <= p.depthMax ? 1 : 0.15;
  const temperature =
    c.temperatureC >= p.temperatureMinC && c.temperatureC <= p.temperatureMaxC
      ? 1
      : 0.3;
  const delta = Math.abs(c.hour - p.activeHour);
  const time = 0.45 + 0.55 * (1 - Math.min(delta, 24 - delta) / 12);
  const habitat = sim.cast!.habitat === p.habitat ? 1.35 : 0.8;
  const baitFactor = fish.preferredBaits.includes(bait) ? 1 : 0.2;
  const weather = c.weather === 'STORM' ? 0.55 : c.weather === 'RAIN' ? 1.1 : 1;
  const caution = 1 - p.caution * sim.noise * c.clarity * 0.65;
  return clamp(
    depthScore *
      temperature *
      time *
      habitat *
      baitFactor *
      weather *
      caution *
      c.quality,
    0.01,
    1.5,
  );
}
export function prepareSimulatorCast(
  state: EngineState,
  aim: number,
  power: number,
  depth: number,
): void {
  const sim = state.simulation!;
  sim.cast = solveCast(sim, aim, power, depth);
  sim.distanceM = sim.cast.distanceM;
  sim.noise = clamp(power ** 2 * (sim.baitMassG / 25), 0, 1);
  // The extreme bank edges contain cover. Power and current decide whether tackle snags.
  sim.snagged = (sim.cast.aim < 0.025 || sim.cast.aim > 0.975) && power > 0.9;
}
export function scheduleBehavior(
  state: EngineState,
  now: number,
  random: RandomSource,
): void {
  const sim = state.simulation!,
    fish = state.selectedFish!;
  const p = fish.behavior ?? behaviorFor(fish.slug);
  sim.suitability = ecologyScore(fish, sim, state.baitSlug);
  const variation = 0.8 + random() * 0.4;
  const waitMs = clamp(
    ((4500 + p.caution * 4000 + sim.noise * 5000) /
      Math.max(0.18, sim.suitability)) *
      variation,
    4500,
    state.tutorial ? 9000 : 35000,
  );
  const landedAt = now + sim.cast!.flightMs;
  sim.approachAt = landedAt + waitMs * 0.3;
  sim.inspectAt = landedAt + waitMs * 0.6;
  sim.feedingAt = landedAt + waitMs * 0.85;
  // Ecology decides rejection; randomness only varies the timing, never overrides incompatible bait/depth.
  sim.rejected = !state.tutorial && sim.suitability < 0.075;
  sim.refusedUntil = landedAt + waitMs;
  state.castEndsAt = landedAt;
  state.biteAt = landedAt + waitMs;
  state.hookDeadline =
    state.biteAt + Math.max(state.tutorial ? 3000 : 0, fish.hookWindowMs) + 150;
}
export function behaviorAt(
  state: EngineState,
  now: number,
): SimulatorView['behavior'] {
  const sim = state.simulation!;
  if (state.outcome === 'CAUGHT') return 'CAUGHT';
  if (state.outcome === 'ESCAPED') return 'ESCAPING';
  if (state.state === 'HOOKING') return 'HOOKED';
  if (state.state === 'REELING') return 'EXHAUSTED';
  if (state.state === 'FIGHTING')
    return state.stamina < 15 ? 'EXHAUSTED' : 'FIGHTING';
  if (state.state === 'BITE') return 'BITING';
  if (!sim.cast || now < state.castEndsAt!) return 'SWIMMING';
  if (now < sim.approachAt) return 'SEARCHING';
  if (now < sim.inspectAt) return 'APPROACHING';
  if (now < sim.feedingAt) return 'INSPECTING';
  return sim.rejected ? 'ESCAPING' : 'FEEDING';
}
export function simulatorView(state: EngineState, now: number): SimulatorView {
  const sim = state.simulation!;
  const behavior = behaviorAt(state, now);
  return {
    conditions: sim.conditions,
    behavior,
    cue:
      behavior === 'BITING'
        ? 'RUN'
        : behavior === 'FEEDING'
          ? 'DIP'
          : behavior === 'INSPECTING'
            ? 'NUDGE'
            : 'NONE',
    ...(sim.cast ? { cast: sim.cast } : {}),
    drag: sim.drag,
    rodAngle: sim.rodAngle,
    fishDirection: sim.fishDirection,
    lineDurability: Math.round(sim.lineDurability * 10) / 10,
    rodLoad: Math.round(sim.rodLoad * 10) / 10,
    distanceM: Math.round(sim.distanceM * 10) / 10,
    lineStrengthKg: sim.tackle.lineStrengthKg,
    maxDragKg: sim.tackle.maxDragKg,
  };
}

/** Fixed server tick. UI never supplies forces, distance, stamina, weight or outcomes. */
export function simulateFight(
  state: EngineState,
  tickAt: number,
  dt: number,
): EscapeReason | undefined {
  const sim = state.simulation!,
    fish = state.selectedFish!;
  const p: BehaviorProfile = fish.behavior ?? behaviorFor(fish.slug);
  const hold = state.held && tickAt <= state.holdUntil;
  const elapsed = tickAt - state.fightStartedAt!;
  const phase =
    (elapsed * Math.PI * 2) / state.surgePeriodMs + state.surgePhase;
  const surge =
    p.fightStyle === 'DASH'
      ? Math.max(0, Math.sin(phase)) ** 6
      : p.fightStyle === 'BOTTOM'
        ? 0.55 + Math.sin(phase * 0.6) * 0.2
        : p.fightStyle === 'SURFACE'
          ? Math.max(0, Math.sin(phase * 1.8))
          : (1 + Math.sin(phase)) / 2;
  sim.fishDirection = Math.sin(phase * (p.fightStyle === 'WEAVE' ? 1.7 : 0.7));
  const counterSteer = clamp(-sim.rodAngle * sim.fishDirection, -1, 1);
  const mass = clamp(
    Math.sqrt(state.selectedWeightG! / fish.baseWeightG),
    0.5,
    2.5,
  );
  const fatigue = 0.25 + (state.stamina / 100) * 0.75;
  const fishLoad =
    (0.4 +
      Math.sqrt(state.selectedWeightG! / 1000) * fish.pullStrength * 0.25) *
      mass *
      fatigue +
    sim.conditions.currentMps * 0.35;
  const dragKg = sim.tackle.maxDragKg * sim.drag;
  const forceKg =
    fishLoad * (0.3 + surge * 0.6) + (hold ? dragKg * 0.7 : dragKg * 0.2);
  sim.rodLoad = clamp((forceKg / sim.tackle.rodLoadKg) * 100, 0, 100);
  const gearStress = clamp(forceKg / sim.tackle.lineStrengthKg, 0.1, 3);
  const increase =
    (10 + fish.pullStrength * 1.1 + surge * p.speed * 8) *
      mass *
      (0.45 + sim.drag) *
      (0.6 + gearStress) *
      (1 - sim.tackle.stretch * 0.3) -
    state.rodControl * 0.8 -
    counterSteer * 4;
  if (hold) {
    state.tension += Math.max(2, increase) * dt;
    const efficiency = clamp(dragKg / Math.max(0.5, fishLoad * 0.5), 0.15, 1.3);
    state.stamina -=
      ((Math.max(2, 13 + state.rodPower * 1.3 - fish.pullStrength * 0.8) *
        efficiency) /
        (p.endurance * mass)) *
      dt;
    state.progress +=
      ((Math.max(
        1,
        (state.state === 'REELING' ? 20 : 10) +
          state.rodPower * 0.7 -
          fish.pullStrength * 0.2 -
          surge * 3 +
          counterSteer * 2,
      ) *
        efficiency) /
        mass) *
      dt;
  } else {
    state.tension -= (22 + state.rodControl * 1.5 + (1 - sim.drag) * 6) * dt;
    state.progress -=
      (1 + surge * p.speed * 2 + (1 - sim.drag) * 2) * fatigue * dt;
    if (state.state !== 'REELING') state.stamina += 0.6 * dt;
  }
  state.tension = clamp(state.tension, 0, 100);
  state.progress = clamp(state.progress, 0, 100);
  state.stamina = clamp(state.stamina, 0, 100);
  sim.distanceM = clamp(
    sim.cast!.distanceM * (1 - state.progress / 100) +
      (state.state === 'CAUGHT' ? 0 : 0.5),
    0,
    150,
  );
  const abrasion =
    sim.cast!.habitat === 'ROCKS' || sim.cast!.habitat === 'REEDS';
  sim.lineDurability = clamp(
    sim.lineDurability -
      (state.tension > 85 ? (state.tension - 85) * 0.07 : 0) * dt -
      (abrasion && hold ? (1 - sim.tackle.abrasionResistance) * 0.35 : 0) * dt,
    0,
    100,
  );
  state.dangerMs = state.tension > 95 ? state.dangerMs + dt * 1000 : 0;
  state.farMs =
    state.progress === 0 && elapsed > 3000 ? state.farMs + dt * 1000 : 0;
  sim.slackMs =
    state.tension < 5 && elapsed > 3000
      ? sim.slackMs + dt * 1000
      : Math.max(0, sim.slackMs - dt * 1500);
  if (state.dangerMs >= 800 || sim.lineDurability <= 0) return 'LINE_BROKE';
  if (sim.slackMs >= 6000 * sim.tackle.hookGrip * sim.hookQuality)
    return 'SLACK_LINE';
  if (state.farMs >= 6000) return 'FISH_TOO_FAR';
  if (elapsed >= 75000) return 'TIMEOUT';
  if (state.state === 'FIGHTING' && state.stamina <= 0 && state.progress >= 80)
    state.state = 'REELING';
  return undefined;
}
