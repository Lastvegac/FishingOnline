import type { ComponentProps } from 'react';
import {
  EquipmentArt as SharedEquipmentArt,
  FishArt as SharedFishArt,
  LakeArt as SharedLakeArt,
} from '@fwo/ui';
import { usePreferences } from './data';

/** 3D artwork wired to the player's in-game reduced-motion preference. */
export function LakeArt(props: ComponentProps<typeof SharedLakeArt>) {
  const reducedMotion = usePreferences((s) => s.reducedMotion);
  return <SharedLakeArt reducedMotion={reducedMotion} {...props} />;
}
export function FishArt(props: ComponentProps<typeof SharedFishArt>) {
  const reducedMotion = usePreferences((s) => s.reducedMotion);
  return <SharedFishArt reducedMotion={reducedMotion} {...props} />;
}
export function EquipmentArt(props: ComponentProps<typeof SharedEquipmentArt>) {
  const reducedMotion = usePreferences((s) => s.reducedMotion);
  return <SharedEquipmentArt reducedMotion={reducedMotion} {...props} />;
}
