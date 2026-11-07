import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LakeParticipantDto, LakePresenceDto } from '@fwo/contracts';
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  Modal,
  useI18n,
  formatWeight,
} from '@fwo/ui';
import { CharacterPreview } from '@fwo/ui/character-preview';
import { api, usePreferences } from '../data';
type Lease = { leaseId: string; sequence: number; x: number; z: number };
export function LakeCharacters({
  locationId,
  fishing,
  onCharacters,
}: {
  locationId: string;
  fishing: boolean;
  onCharacters: (items: LakeParticipantDto[]) => void;
}) {
  const { t } = useI18n(),
    prefs = usePreferences();
  const [lease, setLease] = useState<Lease | null>(null),
    [error, setError] = useState<Error | null>(null),
    [retry, setRetry] = useState(0),
    [selected, setSelected] = useState<LakeParticipantDto | null>(null);
  const target = useRef<{
      dx: number;
      action: 'IDLE' | 'WALK' | 'RUN' | 'SIT' | 'INTERACT';
    }>({ dx: 0, action: 'IDLE' }),
    current = useRef<Lease | null>(null),
    active = useRef(fishing);
  active.current = fishing;
  useEffect(() => {
    let cancelled = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    setError(null);
    setLease(null);
    const heartbeat = async () => {
      const prior = current.current;
      if (!prior || cancelled) return;
      const x = active.current
        ? prior.x
        : Math.max(-8, Math.min(-3.5, prior.x + target.current.dx));
      const next = { ...prior, sequence: prior.sequence + 1, x };
      try {
        await api.request('/characters/presence', {
          method: 'PATCH',
          body: {
            ...next,
            action: active.current ? 'IDLE' : target.current.action,
          },
        });
        if (!cancelled) {
          current.current = next;
          target.current.dx = 0;
          setError(null);
          timer = setTimeout(() => void heartbeat(), 2000);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setLease(null);
          current.current = null;
        }
      }
    };
    void api
      .request<Lease>('/characters/presence', {
        method: 'POST',
        body: { locationId },
      })
      .then((next) => {
        if (cancelled) {
          void api
            .request('/characters/presence', {
              method: 'DELETE',
              body: { leaseId: next.leaseId },
            })
            .catch(() => {});
          return;
        }
        current.current = next;
        setLease(next);
        timer = setTimeout(() => void heartbeat(), 2000);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      const prior = current.current;
      current.current = null;
      onCharacters([]);
      if (prior)
        void api
          .request('/characters/presence', {
            method: 'DELETE',
            body: { leaseId: prior.leaseId },
          })
          .catch(() => {});
    };
  }, [locationId, retry, onCharacters]);
  const presence = useQuery({
    queryKey: ['lake-characters', locationId, lease?.leaseId],
    queryFn: () =>
      api.request<LakePresenceDto>(`/locations/${locationId}/characters`),
    enabled: !!lease,
    refetchInterval: 2000,
    retry: false,
  });
  useEffect(() => {
    onCharacters(presence.data?.items ?? []);
  }, [presence.data, onCharacters]);
  const requestAction = (action: typeof target.current.action, dx = 0) => {
    target.current = { action, dx };
  };
  return (
    <Card padded>
      <h3>{t('fashion.lakeTitle')}</h3>
      {error ? (
        <ErrorState error={error} retry={() => setRetry((r) => r + 1)} />
      ) : !lease ? (
        <LoadingState label={t('fashion.lakeJoining')} />
      ) : presence.error ? (
        <ErrorState
          error={presence.error}
          retry={() => setRetry((r) => r + 1)}
        />
      ) : (
        <>
          <div className="fwo-character-controls">
            <Button
              variant="secondary"
              disabled={fishing}
              onClick={() => requestAction('WALK', -0.6)}
            >
              {t('fashion.walkLeft')}
            </Button>
            <Button
              variant="secondary"
              disabled={fishing}
              onClick={() => requestAction('WALK', 0.6)}
            >
              {t('fashion.walkRight')}
            </Button>
            <Button
              variant="ghost"
              disabled={fishing}
              onClick={() => requestAction('SIT')}
            >
              {t('fashion.sit')}
            </Button>
            <Button
              variant="ghost"
              disabled={fishing}
              onClick={() => requestAction('IDLE')}
            >
              {t('fashion.stand')}
            </Button>
            <Button
              variant="ghost"
              disabled={fishing}
              onClick={() => requestAction('INTERACT')}
            >
              {t('fashion.wave')}
            </Button>
          </div>
          <div className="fwo-character-controls">
            {presence.data?.items.map((p) => (
              <Button
                key={p.userId}
                variant="secondary"
                onClick={() => setSelected(p)}
              >
                {p.character.name}
              </Button>
            ))}
          </div>
        </>
      )}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.character.name ?? t('fashion.lakeTitle')}
      >
        {selected && (
          <>
            <p>{selected.username}</p>
            <p>
              {t('fashion.lakeInfo', {
                level: selected.level,
                count: selected.totalFish,
                weight: formatWeight(selected.largestFishG),
              })}
            </p>
            <CharacterPreview
              {...selected.character}
              animation={selected.animation}
              reducedMotion={prefs.reducedMotion}
            />
          </>
        )}
      </Modal>
    </Card>
  );
}
