import { createLakeWorld, type LakeFishingView } from '@fwo/ui/lake-3d';
import type {
  CharacterDto,
  CharacterAnimation,
  LakeParticipantDto,
  Environment,
  WaterConditions,
  SessionDto,
} from '@fwo/contracts';

const LINE_IN_WATER = new Set([
  'CASTING',
  'WAITING',
  'BITE',
  'HOOKING',
  'FIGHTING',
  'REELING',
]);

/** Maps the authoritative server snapshot to what the 3D lake should show. */
export function lakeViewFor(snapshot: SessionDto | null): LakeFishingView {
  const state = snapshot?.state ?? '';
  return {
    active: LINE_IN_WATER.has(state),
    bite: state === 'BITE',
    fighting: state === 'FIGHTING' || state === 'REELING',
    progress: snapshot?.progress ?? 0,
    casting: state === 'CASTING',
    simulator: snapshot?.simulator,
  };
}

export type LakeGame = {
  setCharacter(character: CharacterDto): void;
  setCharacters(characters: LakeParticipantDto[], localUserId: string): void;
  setSnapshot(snapshot: SessionDto | null): void;
  setReducedMotion(reduced: boolean): void;
  setPreview(
    aim: number,
    power: number,
    environment?: Environment,
    conditions?: WaterConditions,
  ): void;
  destroy(): void;
};

export function createLakeGame(
  parent: HTMLElement,
  initial: SessionDto | null,
  reducedMotion: boolean,
  onTap: (aim?: number) => void,
): LakeGame {
  const world = createLakeWorld(parent, {
    reducedMotion,
    fishing: lakeViewFor(initial),
    onTap,
  });
  if (!world) {
    // Without WebGL the token gradient stays visible and taps still drive the game.
    const onPointer = (event: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      onTap(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
    };
    parent.addEventListener('pointerdown', onPointer);
    return {
      setSnapshot() {},
      setCharacter() {},
      setCharacters() {},
      setReducedMotion() {},
      setPreview() {},
      destroy: () => parent.removeEventListener('pointerdown', onPointer),
    };
  }
  let character: CharacterDto | null = null;
  const animationFor = (snapshot: SessionDto | null): CharacterAnimation => {
    const map: Record<string, CharacterAnimation> = {
      CASTING: 'CAST',
      WAITING: 'WAIT',
      BITE: 'BITE',
      HOOKING: 'HOOK',
      FIGHTING: 'FIGHT',
      REELING: 'REEL',
      CAUGHT: 'HOLD_FISH',
      ESCAPED: 'FAIL',
    };
    return (
      map[snapshot?.state ?? ''] ??
      (character?.appearance.fishingStyle === 'SEATED' ? 'SIT' : 'IDLE')
    );
  };
  let current = initial;
  let preview: Pick<
    LakeFishingView,
    'previewAim' | 'previewPower' | 'environment' | 'conditions'
  > = {};
  return {
    setCharacter: (next) => {
      character = next;
      world.setCharacter(next, animationFor(current));
    },
    setCharacters: (next, id) => world.setCharacters(next, id),
    setSnapshot: (snapshot) => {
      current = snapshot;
      if (character) world.setCharacter(character, animationFor(snapshot));
      world.setFishing({ ...preview, ...lakeViewFor(snapshot) });
    },
    setPreview: (aim, power, environment, conditions) => {
      preview = {
        previewAim: aim,
        previewPower: power,
        environment,
        conditions,
      };
      world.setFishing({ ...preview, ...lakeViewFor(current) });
    },
    setReducedMotion: (reduced) => world.setReducedMotion(reduced),
    destroy: () => world.destroy(),
  };
}
