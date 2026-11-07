import { useEffect, useRef, useState } from 'react';
import type { CharacterAppearance, CharacterEquipment } from '@fwo/contracts';
export function CharacterThumbnail({
  appearance,
  equipment,
  presetId,
}: {
  appearance: CharacterAppearance;
  equipment: CharacterEquipment;
  presetId: string;
}) {
  const host = useRef<HTMLSpanElement>(null),
    [src, setSrc] = useState<string | null>(null);
  const key = JSON.stringify({ appearance, equipment, presetId });
  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    void import('./three/character-portraits')
      .then((m) =>
        host.current
          ? m.characterPortrait(JSON.parse(key), host.current)
          : null,
      )
      .then((image) => {
        if (!cancelled) setSrc(image);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);
  return (
    <span ref={host} className="fwo-character-thumbnail" aria-hidden="true">
      {src && <img src={src} alt="" loading="lazy" draggable={false} />}
    </span>
  );
}
