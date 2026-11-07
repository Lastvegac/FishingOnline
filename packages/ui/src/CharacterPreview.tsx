import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  UserRound,
  Maximize,
} from 'lucide-react';
import {
  Button,
  IconButton,
  LoadingState,
  ErrorState,
  Notice,
  useI18n,
} from './index';
import type {
  CharacterAppearance,
  CharacterEquipment,
  CharacterAnimation,
} from '@fwo/contracts';
type Studio = NonNullable<
  ReturnType<
    (typeof import('./three/character-studio'))['mountCharacterStudio']
  >
>;
export function CharacterPreview({
  appearance,
  equipment,
  presetId,
  animation = 'IDLE',
  night = false,
  reducedMotion = false,
}: {
  appearance: CharacterAppearance;
  equipment: CharacterEquipment;
  presetId: string;
  animation?: CharacterAnimation;
  night?: boolean;
  reducedMotion?: boolean;
}) {
  const { t } = useI18n(),
    host = useRef<HTMLDivElement>(null),
    viewer = useRef<Studio | null>(null);
  const initial = useRef({ appearance, equipment, presetId });
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'unavailable' | 'error'
  >('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    void import('./three/character-studio')
      .then((m) => {
        if (cancelled || !host.current) return;
        viewer.current = m.mountCharacterStudio(
          host.current,
          initial.current,
          reducedMotion,
        );
        setStatus(viewer.current ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      viewer.current?.destroy();
      viewer.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    initial.current = { appearance, equipment, presetId };
    if (status === 'ready') viewer.current?.setVisual(initial.current);
  }, [appearance, equipment, presetId, status]);
  useEffect(() => {
    viewer.current?.setAnimation(animation);
  }, [animation, status]);
  useEffect(() => {
    viewer.current?.setNight(night);
  }, [night, status]);
  useEffect(() => {
    viewer.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion, status]);
  return (
    <div className="fwo-character-preview">
      <div
        ref={host}
        className="fwo-character-stage"
        role="img"
        aria-label={t('character.previewDescription')}
      />
      {status === 'loading' && (
        <div className="fwo-character-status">
          <LoadingState />
        </div>
      )}
      {status === 'error' && (
        <div className="fwo-character-status">
          <ErrorState
            error={new Error(t('character.previewError'))}
            retry={() => setAttempt((a) => a + 1)}
          />
        </div>
      )}
      {status === 'unavailable' && (
        <div className="fwo-character-status">
          <Notice tone="warning">{t('character.noWebgl')}</Notice>
        </div>
      )}
      <div className="fwo-character-controls">
        <IconButton
          label={t('character.rotateLeft')}
          disabled={status !== 'ready'}
          onClick={() => viewer.current?.rotate(-Math.PI / 4)}
        >
          <RotateCcw size={17} />
        </IconButton>
        <IconButton
          label={t('character.rotateRight')}
          disabled={status !== 'ready'}
          onClick={() => viewer.current?.rotate(Math.PI / 4)}
        >
          <RotateCw size={17} />
        </IconButton>
        <IconButton
          label={t('character.zoomIn')}
          disabled={status !== 'ready'}
          onClick={() => viewer.current?.zoom(0.8)}
        >
          <ZoomIn size={17} />
        </IconButton>
        <IconButton
          label={t('character.zoomOut')}
          disabled={status !== 'ready'}
          onClick={() => viewer.current?.zoom(1.25)}
        >
          <ZoomOut size={17} />
        </IconButton>
        <IconButton
          label={t('character.faceView')}
          disabled={status !== 'ready'}
          onClick={() => viewer.current?.portrait()}
        >
          <UserRound size={17} />
        </IconButton>
        <IconButton
          label={t('character.fullBody')}
          disabled={status !== 'ready'}
          onClick={() => viewer.current?.fullBody()}
        >
          <Maximize size={17} />
        </IconButton>
        <Button
          variant="secondary"
          disabled={status !== 'ready'}
          onClick={() => {
            const url = viewer.current?.capture();
            if (!url) return;
            const link = document.createElement('a');
            link.href = url;
            link.download = 'fishing-world-outfit.png';
            link.click();
          }}
        >
          <Camera size={16} />
          {t('fashion.snapshot')}
        </Button>
      </div>
    </div>
  );
}
