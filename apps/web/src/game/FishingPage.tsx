import { useQuery } from '@tanstack/react-query';
import { t as translate, useI18n, localeTag } from '@fwo/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Check,
  Fish,
  Leaf,
  RotateCcw,
  Volume2,
  VolumeX,
  Waves,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Backpack,
  Users,
  Activity,
  Vibrate,
  VibrateOff,
} from 'lucide-react';
import {
  ApiError,
  Badge,
  Button,
  BottomActions,
  Card,
  CurrencyAmount,
  EmptyState,
  ErrorState,
  FishArt,
  FormField,
  IconButton,
  LoadingState,
  Modal,
  Notice,
  PageHeader,
  Progress,
  RangeField,
  Select,
  formatWeight,
  useToast,
} from '@fwo/ui';
import type { CatchDto, WaterConditions, SessionDto } from '@fwo/contracts';
import {
  api,
  invalidateGame,
  useAuth,
  useInventory,
  useLocations,
  usePreferences,
  track,
  protectFishing,
} from '../data';
import { createLakeGame, type LakeGame } from './LakeScene';
import { createFishingAudio, createFishingHaptics } from './FishingAudio';
import { LakeCharacters } from './LakeCharacters';
import { useCharacter } from '../character-data';
import type { LakeParticipantDto } from '@fwo/contracts';
import { LakeCommunity } from './LakeCommunity';
import styles from './game.module.css';
const stateMessages: () => Record<
  string,
  { title: string; description: string }
> = () => ({
  IDLE: {
    title: translate('ui.choose.bait.cast.and.wait.a.little'),
    description: translate('ui.the.lake.is.peaceful.today.are.you'),
  },
  CASTING: {
    title: translate('ui.your.line.is.on.its.way'),
    description: translate('ui.a.gentle.touch.lets.the.bait.meet'),
  },
  WAITING: {
    title: translate('ui.listen.to.the.lake'),
    description: translate('ui.fish.will.come.soon.watch.your.float'),
  },
  BITE: {
    title: translate('ui.a.bite.strike.now'),
    description: translate('ui.press.strike.or.space.before.the.fish'),
  },
  HOOKING: {
    title: translate('ui.hooked.get.ready.to.reel'),
    description: translate('ui.hold.to.reel.the.fish.in.release'),
  },
  FIGHTING: {
    title: translate('ui.be.patient.you.are.doing.well'),
    description: translate('ui.hold.to.reel.in.release.when.the'),
  },
  REELING: {
    title: translate('ui.the.fish.is.almost.at.the.bank'),
    description: translate('ui.keep.holding.and.releasing.in.rhythm.just'),
  },
  CAUGHT: {
    title: translate('ui.a.new.friend.has.reached.the.bank'),
    description: translate('ui.the.server.has.recorded.the.result.and'),
  },
  ESCAPED: {
    title: translate('ui.the.fish.got.away'),
    description: translate('ui.that.s.all.right.every.trip.has'),
  },
  FINISHED: {
    title: translate('ui.this.fishing.trip.has.ended'),
    description: translate('ui.ready.for.another.cast'),
  },
});
const escapeMessages: () => Record<string, string> = () => ({
  MISSED_HOOK: translate('ui.you.missed.the.strike.window.strike.as'),
  LINE_BROKE: translate('ui.the.line.snapped.under.tension.release.the'),
  FISH_TOO_FAR: translate('ui.the.fish.swam.too.far.away.alternate'),
  ABANDONED: translate('ui.your.fishing.session.ended.when.you.left'),
  TIMEOUT: translate('ui.the.fishing.trip.timed.out'),
  EARLY_STRIKE: translate('sim.escape.EARLY_STRIKE'),
  SLACK_LINE: translate('sim.escape.SLACK_LINE'),
  BAIT_REJECTED: translate('sim.escape.BAIT_REJECTED'),
  SNAGGED: translate('sim.escape.SNAGGED'),
});
export default function FishingPage() {
  useI18n();
  const character = useCharacter();
  const inventory = useInventory();
  const locations = useLocations();
  const player = useAuth((s) => s.player)!;
  const sessionExpired = useAuth((s) => s.sessionExpired);
  const prefs = usePreferences();
  const navigate = useNavigate();
  const toast = useToast();
  const [session, setSession] = useState<SessionDto | null>(null);
  const [lastCaught, setLastCaught] = useState<CatchDto>();
  const snapshot = useRef<SessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const flightWaiters = useRef<Array<() => void>>([]);
  const hookQueued = useRef(false);
  const [error, setError] = useState('');
  const [holding, setHolding] = useState(false);
  const hold = useRef(false);
  const [bait, setBait] = useState('');
  const [aim, setAim] = useState(0.5);
  const [power, setPower] = useState(0.6);
  const [depth, setDepth] = useState(0.5);
  const [drag, setDrag] = useState(0.55);
  const [rodAngle, setRodAngle] = useState(0);
  const controls = useRef({ drag: 0.55, rodAngle: 0 });
  const [scenery, setScenery] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tuningOpen, setTuningOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [kitOpen, setKitOpen] = useState(false);
  const [lakesideOpen, setLakesideOpen] = useState(false);
  const haptics = useRef(createFishingHaptics());
  const scenePanel = useRef<HTMLElement>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(player.totalFish === 0);
  const visitId = useRef(crypto.randomUUID());
  const canvas = useRef<HTMLDivElement>(null);
  const game = useRef<LakeGame | null>(null);
  const soundscape = useRef<ReturnType<typeof createFishingAudio> | null>(null);
  // Latest spot conditions (local hour, terrain, weather) for the ambience.
  const ambience = useRef<WaterConditions | undefined>(undefined);
  const resumeSound = useCallback(() => {
    if (!usePreferences.getState().sound) return;
    try {
      soundscape.current ??= createFishingAudio();
      soundscape.current.setAmbience(ambience.current);
      soundscape.current.enabled(document.visibilityState === 'visible');
      soundscape.current.update(snapshot.current, hold.current);
    } catch {
      /* Audio is optional on browsers without Web Audio support. */
    }
  }, []);
  const alive = useRef(true);
  const actionRef = useRef<(aim?: number) => void>(() => {});
  const pendingRequest = useRef<{
    path: string;
    body: unknown;
    key: string;
  } | null>(null);
  const lastRequestStatus = useRef<number | null>(null);
  const lastReward = useRef('');
  const releaseFlight = useCallback(() => {
    inFlight.current = false;
    for (const resolve of flightWaiters.current.splice(0)) resolve();
  }, []);
  const update = useCallback((next: SessionDto | null) => {
    if (!alive.current) return;
    const prev = snapshot.current;
    snapshot.current = next;
    if (next && next.state !== 'IDLE') protectFishing(true);
    if (next?.id !== prev?.id && next?.simulator) {
      controls.current = {
        drag: next.simulator.drag,
        rodAngle: next.simulator.rodAngle,
      };
      setDrag(next.simulator.drag);
      setRodAngle(next.simulator.rodAngle);
    }
    setSession(next);
    if (next?.catch) setLastCaught(next.catch);
    game.current?.setSnapshot(next);
    soundscape.current?.update(next, hold.current);
    haptics.current.update(
      next,
      usePreferences.getState().haptics,
      hold.current,
    );
    if (
      next?.state !== prev?.state &&
      ![next?.state, prev?.state].every(
        (state) => state && ['FIGHTING', 'REELING'].includes(state),
      )
    ) {
      setTuningOpen(false);
      setDetailsOpen(false);
    }
    if (next && ['CAUGHT', 'ESCAPED', 'FINISHED'].includes(next.state)) {
      hold.current = false;
      setHolding(false);
      setResultOpen(true);
      if (next.catch && lastReward.current !== next.catch.id) {
        lastReward.current = next.catch.id;
        if (
          next.catch.isNewSpecies &&
          useAuth.getState().player?.totalFish === 0
        )
          track(
            'tutorial_completed',
            { firstCatch: true },
            `tutorial-complete:${useAuth.getState().player?.id}`,
          );
        void invalidateGame().catch(() => {});
      }
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    protectFishing(true);
    const startedAt = Date.now();
    track('session_started', { screen: 'fishing' }, visitId.current);
    if (useAuth.getState().player?.totalFish === 0)
      track(
        'tutorial_started',
        { screen: 'fishing' },
        `tutorial-start:${useAuth.getState().player?.id}`,
      );
    let stopped = false;
    void api
      .request<SessionDto | null>('/fishing/sessions/active')
      .then((s) => {
        if (!stopped) {
          update(s);
          if (!s || s.state === 'IDLE') protectFishing(false);
        }
      })
      .catch((e) => {
        if (!stopped) setError(e.message);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
      alive.current = false;
      queueMicrotask(() => {
        if (!alive.current) protectFishing(false);
      });
      hold.current = false;
      hookQueued.current = false;
      haptics.current.stop();
      soundscape.current?.destroy();
      soundscape.current = null;
      for (const resolve of flightWaiters.current.splice(0)) resolve();
      if (Date.now() - startedAt > 1000)
        track(
          'session_ended',
          { durationSeconds: Math.round((Date.now() - startedAt) / 1000) },
          `end:${visitId.current}`,
        );
    };
  }, [update]);
  useEffect(() => {
    if (!canvas.current) return;
    game.current = createLakeGame(
      canvas.current,
      snapshot.current,
      prefs.reducedMotion,
      (value) => actionRef.current(value),
    );
    return () => {
      game.current?.destroy();
      game.current = null;
    };
  }, []);
  useEffect(() => {
    if (character.data) game.current?.setCharacter(character.data);
  }, [character.data]);
  const updateCharacters = useCallback(
    (items: LakeParticipantDto[]) => {
      game.current?.setCharacters(items, player.id);
    },
    [player.id],
  );
  useEffect(() => {
    game.current?.setReducedMotion(prefs.reducedMotion);
  }, [prefs.reducedMotion]);
  useEffect(() => {
    const apply = () => {
      soundscape.current?.enabled(
        prefs.sound && document.visibilityState === 'visible',
      );
      if (document.visibilityState !== 'visible' || !prefs.haptics)
        haptics.current.stop();
    };
    apply();
    document.addEventListener('visibilitychange', apply);
    // Browser audio is unlocked by the first real gesture at the lake.
    document.addEventListener('pointerdown', resumeSound);
    document.addEventListener('keydown', resumeSound);
    return () => {
      document.removeEventListener('visibilitychange', apply);
      document.removeEventListener('pointerdown', resumeSound);
      document.removeEventListener('keydown', resumeSound);
    };
  }, [prefs.sound, prefs.haptics, resumeSound]);
  const selectedLocation =
    locations.data?.items.find(
      (l) =>
        l.id ===
        (session?.locationId ??
          new URLSearchParams(window.location.search).get('location')),
    ) ?? locations.data?.items.find((l) => l.unlocked);
  const forecast = useQuery({
    queryKey: ['water-conditions', selectedLocation?.id],
    queryFn: () =>
      api.request<WaterConditions>(
        `/fishing/locations/${selectedLocation!.id}/conditions`,
      ),
    enabled: !!selectedLocation?.unlocked,
    refetchInterval: 60000,
  });
  useEffect(() => {
    ambience.current = forecast.data;
    soundscape.current?.setAmbience(forecast.data);
    game.current?.setPreview(
      aim,
      power,
      selectedLocation?.environment,
      forecast.data,
    );
  }, [aim, power, selectedLocation?.environment, forecast.data]);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  useEffect(() => {
    if (!bait) {
      const first = inventory.data?.items.find(
        (i) => i.kind === 'BAIT' && i.quantity > 0,
      );
      if (first) setBait(first.id);
    }
  }, [inventory.data, bait]);
  const send = useCallback(
    async (path: string, body: unknown) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setBusy(true);
      setError('');
      lastRequestStatus.current = null;
      const request = { path, body, key: crypto.randomUUID() };
      pendingRequest.current = request;
      try {
        const next = await api.request<SessionDto>(path, {
          method: 'POST',
          body,
          idempotencyKey: request.key,
        });
        pendingRequest.current = null;
        update(next);
        return next;
      } catch (e) {
        lastRequestStatus.current = e instanceof ApiError ? e.status : null;
        if (
          e instanceof ApiError &&
          e.code === 'VERSION_CONFLICT' &&
          snapshot.current
        ) {
          pendingRequest.current = null;
          const next = await api.request<SessionDto>(
            `/fishing/sessions/${snapshot.current.id}`,
          );
          update(next);
          return next;
        }
        if (e instanceof ApiError && e.status > 0)
          pendingRequest.current = null;
        setError((e as Error).message);
        return null;
      } finally {
        releaseFlight();
        if (alive.current) setBusy(hookQueued.current);
      }
    },
    [update, releaseFlight],
  );
  const start = useCallback(async () => {
    if (inFlight.current) return;
    resumeSound();
    if (!bait) {
      toast(translate('ui.choose.bait.before.casting'), 'danger');
      return;
    }
    let current = snapshot.current;
    if (current && ['CAUGHT', 'ESCAPED', 'FINISHED'].includes(current.state))
      return;
    const location = selectedLocation;
    if (!location) return;
    if (useAuth.getState().sessionExpired) {
      protectFishing(false);
      return;
    }
    protectFishing(true);
    try {
      if (!current) {
        current = await send('/fishing/sessions', {
          locationId: location.id,
          baitInventoryId: bait,
        });
        if (!current) return;
      }
      if (current.state === 'IDLE') {
        await send(`/fishing/sessions/${current.id}/cast`, {
          expectedVersion: current.version,
          aim,
          power,
          depth,
        });
      }
    } finally {
      if (!snapshot.current || snapshot.current.state === 'IDLE')
        protectFishing(false);
    }
  }, [bait, selectedLocation, send, toast, aim, power, depth, resumeSound]);
  const hook = useCallback(async () => {
    if (
      hookQueued.current ||
      !['BITE', 'WAITING'].includes(snapshot.current?.state ?? '')
    )
      return;
    // A valid input takes priority over background polling. A GET may already
    // be advancing the server snapshot, so wait for it and use its new version
    // rather than silently discarding the click or racing a stale version.
    hookQueued.current = true;
    setBusy(true);
    if (inFlight.current)
      await new Promise<void>((resolve) => flightWaiters.current.push(resolve));
    if (!alive.current) return;
    const current = snapshot.current;
    hookQueued.current = false;
    if (current && ['BITE', 'WAITING'].includes(current.state)) {
      await send(`/fishing/sessions/${current.id}/hook`, {
        expectedVersion: current.version,
      });
    } else {
      setBusy(false);
    }
  }, [send]);
  const setHold = useCallback((value: boolean) => {
    hold.current = value;
    setHolding(value);
    soundscape.current?.update(snapshot.current, value);
    if (!value) haptics.current.stop();
  }, []);
  actionRef.current = (targetAim) => {
    if (tutorialOpen || kitOpen || resultOpen || leaveOpen) return;
    const current = snapshot.current;
    if (!current || current.state === 'IDLE') {
      if (targetAim !== undefined) setAim(targetAim);
      else void start();
    } else if (current.state === 'BITE') void hook();
  };
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (
        tutorialOpen ||
        kitOpen ||
        resultOpen ||
        leaveOpen ||
        e.code !== 'Space' ||
        e.repeat ||
        (e.target instanceof HTMLElement &&
          ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName))
      )
        return;
      e.preventDefault();
      const state = snapshot.current?.state;
      if (state === 'FIGHTING' || state === 'REELING') setHold(true);
      else actionRef.current();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setHold(false);
      }
    };
    const release = () => setHold(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, [setHold, tutorialOpen, kitOpen, resultOpen, leaveOpen]);
  useEffect(() => {
    if (loading || error) return;
    let cancelled = false;
    let timer: number;
    const tick = async () => {
      const current = snapshot.current;
      if (
        !cancelled &&
        current &&
        !inFlight.current &&
        !hookQueued.current &&
        !['IDLE', 'CAUGHT', 'ESCAPED', 'FINISHED'].includes(current.state)
      ) {
        if (['FIGHTING', 'REELING'].includes(current.state)) {
          await send(`/fishing/sessions/${current.id}/reel`, {
            expectedVersion: current.version,
            action: hold.current ? 'hold' : 'release',
            ...controls.current,
          });
        } else {
          inFlight.current = true;
          try {
            const next = await api.request<SessionDto>(
              `/fishing/sessions/${current.id}`,
            );
            if (!cancelled) update(next);
          } catch (e) {
            if (!cancelled) setError((e as Error).message);
          } finally {
            releaseFlight();
          }
        }
      }
      if (!cancelled)
        timer = window.setTimeout(
          tick,
          ['FIGHTING', 'REELING'].includes(snapshot.current?.state ?? '')
            ? 260
            : 400,
        );
    };
    timer = window.setTimeout(tick, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, error, session?.id, send, update, releaseFlight]);
  const retry = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const p = pendingRequest.current;
      if (p) {
        const next = await api.request<SessionDto>(p.path, {
          method: 'POST',
          body: p.body,
          idempotencyKey: p.key,
        });
        pendingRequest.current = null;
        update(next);
      } else {
        const next = snapshot.current
          ? await api.request<SessionDto>(
              `/fishing/sessions/${snapshot.current.id}`,
            )
          : await api.request<SessionDto | null>('/fishing/sessions/active');
        update(next);
      }
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      releaseFlight();
      setBusy(false);
    }
  };
  const finish = async () => {
    const current = snapshot.current;
    if (!current) return;
    if (current.state !== 'FINISHED') {
      const next = await send(`/fishing/sessions/${current.id}/complete`, {
        expectedVersion: current.version,
      });
      if (
        !next &&
        !(
          lastRequestStatus.current === 401 &&
          useAuth.getState().sessionExpired &&
          ['CAUGHT', 'ESCAPED'].includes(current.state)
        )
      )
        return;
    }
    setResultOpen(false);
    update(null);
    setResultOpen(false);
    protectFishing(false);
    if (!useAuth.getState().player) return;
    await invalidateGame().catch(() => {});
  };
  const phase = session?.state ?? 'IDLE';
  const message = stateMessages()[phase];
  const fighting = ['FIGHTING', 'REELING'].includes(phase);
  const sim = session?.simulator;
  const conditions = sim?.conditions ?? forecast.data;
  const number = (value: number, digits = 0) =>
    value.toLocaleString(localeTag(), { maximumFractionDigits: digits });
  const percent = (value: number) =>
    translate('sim.percent', { value: number(value * 100) });
  const waitingBehavior =
    sim &&
    ['SEARCHING', 'APPROACHING', 'INSPECTING', 'FEEDING'].includes(sim.behavior)
      ? translate(
          `sim.behavior.${sim.behavior as 'SEARCHING' | 'APPROACHING' | 'INSPECTING' | 'FEEDING'}`,
        )
      : undefined;
  const selectedBait = inventory.data?.items.find((i) => i.id === bait);
  const active =
    !!session && !['CAUGHT', 'ESCAPED', 'FINISHED'].includes(phase);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (active) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [active]);
  return (
    <>
      <div className={styles.pageHeading}>
        <PageHeader
          title={selectedLocation?.name ?? translate('sim.title')}
          action={
            <div className={styles.headerActions}>
              <IconButton
                label={
                  prefs.sound
                    ? translate('ui.mute.sound')
                    : translate('ui.enable.sound')
                }
                onClick={() => {
                  prefs.toggleSound();
                  if (!prefs.sound) {
                    resumeSound();
                  }
                }}
                aria-pressed={prefs.sound}
              >
                {prefs.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </IconButton>
              <IconButton
                label={translate(
                  prefs.haptics
                    ? 'fishing.muteHaptics'
                    : 'fishing.enableHaptics',
                )}
                aria-pressed={prefs.haptics}
                onClick={() => {
                  prefs.toggleHaptics();
                  haptics.current.stop();
                }}
              >
                {prefs.haptics ? (
                  <Vibrate size={18} />
                ) : (
                  <VibrateOff size={18} />
                )}
              </IconButton>
              <Button
                variant="secondary"
                aria-label={translate('ui.back.to.lobby.2')}
                onClick={() =>
                  active ? setLeaveOpen(true) : navigate('/play')
                }
              >
                <ArrowLeft size={14} />
                <span className={styles.backLabel}>
                  {translate('ui.back.to.lobby.2')}
                </span>
              </Button>
            </div>
          }
        />
      </div>
      <div className={styles.gameLayout} data-scenery={scenery}>
        <section
          ref={scenePanel}
          className={`${styles.gamePanel} ${fullscreen ? styles.fullscreen : ''}`}
        >
          <div className={styles.gameScene}>
            <div
              ref={canvas}
              className={styles.canvas}
              role="img"
              aria-label={translate('sim.scene', {
                location: selectedLocation?.name ?? translate('sim.title'),
              })}
            />
            {!scenery && (
              <div className={styles.sceneHeader}>
                <span className={styles.scenePill}>
                  <Leaf size={12} />
                  {selectedLocation?.name ?? translate('sim.title')}{' '}
                </span>
                <span className={styles.scenePill}>
                  {translate('ui.angler.level.2')} {player.level}
                </span>
              </div>
            )}
            <div className={styles.viewActions}>
              <IconButton
                label={translate(scenery ? 'sim.controls' : 'sim.scenery')}
                onClick={() => setScenery((value) => !value)}
              >
                {scenery ? <Eye size={18} /> : <EyeOff size={18} />}
              </IconButton>
              {document.fullscreenEnabled && (
                <IconButton
                  label={translate(
                    fullscreen ? 'sim.exitFullscreen' : 'sim.fullscreen',
                  )}
                  onClick={async () => {
                    try {
                      if (document.fullscreenElement)
                        await document.exitFullscreen();
                      else await scenePanel.current?.requestFullscreen();
                    } catch {
                      toast(translate('sim.fullscreenFailed'), 'danger');
                    }
                  }}
                >
                  {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </IconButton>
              )}
            </div>
            {phase === 'BITE' && (
              <div className={styles.biteLabel}>
                <Fish size={18} />
                {translate('ui.a.bite')}{' '}
              </div>
            )}
            {!scenery && (
              <div className={styles.sceneCaption}>
                <Waves size={13} />
                {conditions
                  ? translate('fishing.weatherSummary', {
                      weather: translate(`sim.weather.${conditions.weather}`),
                      temperature: number(conditions.temperatureC, 1),
                    })
                  : translate('ui.a.little.peace.a.little.surprise')}
              </div>
            )}
            {fighting && !loading && !error && (
              <div className={styles.fightHud}>
                <Progress
                  testId="tension-meter"
                  label={translate('ui.line.tension')}
                  value={session?.tension ?? 0}
                  tone={(session?.tension ?? 0) > 65 ? 'coral' : 'green'}
                />
                <Progress
                  testId="progress-meter"
                  label={translate('ui.reel.the.fish.in')}
                  value={session?.progress ?? 0}
                  tone="gold"
                />
              </div>
            )}
          </div>
          <div className={styles.gameControls} hidden={scenery && !active}>
            <div
              className={styles.stateText}
              role="status"
              aria-live="polite"
              data-testid="game-state"
              data-state={phase}
            >
              <h3>{message.title}</h3>
              <p className="fwo-sr-only">
                {waitingBehavior ?? message.description}
              </p>
              {fighting && (session?.tension ?? 0) > 70 && (
                <span className={styles.tensionWarning}>
                  {translate('fishing.releaseWarning')}
                </span>
              )}
              <span className="fwo-sr-only">{phase}</span>
            </div>
            {loading ? (
              <LoadingState label={translate('ui.connecting.to.the.lake')} />
            ) : error ? (
              <div className={styles.connectionError}>
                <Notice tone="danger">
                  {error}{' '}
                  {translate(
                    'ui.the.result.is.not.yet.confirmed.reconnect',
                  )}{' '}
                </Notice>
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() => void retry()}
                >
                  <RotateCcw size={14} />
                  {translate('ui.reconnect')}{' '}
                </Button>
              </div>
            ) : (
              <>
                {!scenery && (
                  <div className={styles.tools}>
                    <Button
                      variant="secondary"
                      className={styles.baitButton}
                      onClick={() => {
                        setHold(false);
                        setKitOpen(true);
                      }}
                    >
                      <Backpack size={17} />
                      <span>
                        {selectedBait
                          ? translate('fishing.baitSummary', {
                              bait: selectedBait.name,
                              count: selectedBait.quantity,
                            })
                          : translate('ui.your.lakeside.kit')}
                      </span>
                    </Button>
                    {(phase === 'IDLE' || fighting) && (
                      <IconButton
                        label={translate(
                          fighting ? 'fishing.tuneFight' : 'fishing.tuneCast',
                        )}
                        aria-expanded={tuningOpen}
                        aria-controls="fishing-tuning"
                        onClick={() => setTuningOpen((value) => !value)}
                      >
                        <SlidersHorizontal size={18} />
                      </IconButton>
                    )}
                    <IconButton
                      label={translate('fishing.details')}
                      aria-expanded={detailsOpen}
                      aria-controls="fishing-details"
                      onClick={() => setDetailsOpen((value) => !value)}
                    >
                      <Activity size={18} />
                    </IconButton>
                    <IconButton
                      label={translate('fishing.lakeside')}
                      aria-expanded={lakesideOpen}
                      aria-controls="fishing-lakeside"
                      onClick={() => setLakesideOpen((value) => !value)}
                    >
                      <Users size={18} />
                    </IconButton>
                  </div>
                )}
                {detailsOpen && !scenery && (
                  <div id="fishing-details" className={styles.details}>
                    {conditions && (
                      <p>
                        {translate('sim.conditions', {
                          time: `${Math.floor(conditions.hour).toString().padStart(2, '0')}:00`,
                          weather: translate(
                            `sim.weather.${conditions.weather}`,
                          ),
                          temperature: number(conditions.temperatureC, 1),
                          wind: number(conditions.windMps, 1),
                          current: number(conditions.currentMps, 2),
                        })}
                      </p>
                    )}
                    <div className={styles.meters}>
                      {sim && fighting && (
                        <>
                          <div>
                            <div className={styles.meterLabel}>
                              {translate('sim.stamina')}
                              <span>{number(session?.stamina ?? 0)}%</span>
                            </div>
                            <Progress
                              value={session?.stamina ?? 0}
                              ariaLabel={translate('sim.stamina')}
                              tone="green"
                            />
                          </div>
                          <div>
                            <div className={styles.meterLabel}>
                              {translate('sim.lineDurability')}
                              <span>{number(sim.lineDurability)}%</span>
                            </div>
                            <Progress
                              value={sim.lineDurability}
                              ariaLabel={translate('sim.lineDurability')}
                              tone={sim.lineDurability < 30 ? 'coral' : 'green'}
                            />
                          </div>
                          <div>
                            <div className={styles.meterLabel}>
                              {translate('sim.rodLoad')}
                              <span>{number(sim.rodLoad)}%</span>
                            </div>
                            <Progress
                              value={sim.rodLoad}
                              ariaLabel={translate('sim.rodLoad')}
                              tone={sim.rodLoad > 85 ? 'coral' : 'gold'}
                            />
                          </div>
                          <div>
                            <div className={styles.meterLabel}>
                              {translate('sim.distance')}
                              <span>
                                {translate('sim.meters', {
                                  value: number(sim.distanceM, 1),
                                })}
                              </span>
                            </div>
                            <Progress
                              value={100 - (session?.progress ?? 0)}
                              ariaLabel={translate('sim.distance')}
                              tone="gold"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {phase === 'IDLE' && tuningOpen && !scenery && (
                  <div className={styles.simControls} id="fishing-tuning">
                    <RangeField
                      name="aim"
                      label={translate('sim.aim')}
                      min={0}
                      max={1}
                      step={0.01}
                      value={aim}
                      valueText={percent(aim)}
                      onValueChange={setAim}
                      disabled={busy}
                    />
                    <RangeField
                      name="power"
                      label={translate('sim.power')}
                      min={0.05}
                      max={1}
                      step={0.01}
                      value={power}
                      valueText={percent(power)}
                      onValueChange={setPower}
                      disabled={busy}
                    />
                    <RangeField
                      name="depth"
                      label={translate('sim.depth')}
                      min={0.05}
                      max={1}
                      step={0.01}
                      value={depth}
                      valueText={
                        conditions
                          ? translate('sim.meters', {
                              value: number(depth * conditions.maxDepthM, 1),
                            })
                          : percent(depth)
                      }
                      onValueChange={setDepth}
                      disabled={busy}
                    />
                    <p className={styles.controlHelp}>
                      {translate('sim.castHelp')}
                    </p>
                  </div>
                )}
                {fighting && sim && tuningOpen && (
                  <div className={styles.simControls} id="fishing-tuning">
                    <RangeField
                      name="drag"
                      label={translate('sim.drag')}
                      min={0}
                      max={1}
                      step={0.01}
                      value={drag}
                      valueText={translate('sim.dragForce', {
                        value: number(drag * sim.maxDragKg, 1),
                      })}
                      onValueChange={(value) => {
                        setDrag(value);
                        controls.current.drag = value;
                      }}
                    />
                    <RangeField
                      name="rodAngle"
                      label={translate('sim.angle')}
                      min={-1}
                      max={1}
                      step={0.05}
                      value={rodAngle}
                      valueText={translate(
                        rodAngle < -0.2
                          ? 'sim.left'
                          : rodAngle > 0.2
                            ? 'sim.right'
                            : 'sim.center',
                      )}
                      onValueChange={(value) => {
                        setRodAngle(value);
                        controls.current.rodAngle = value;
                      }}
                    />
                    <p className={styles.controlHelp}>
                      {translate('sim.direction', {
                        direction: translate(
                          sim.fishDirection < -0.2
                            ? 'sim.left'
                            : sim.fishDirection > 0.2
                              ? 'sim.right'
                              : 'sim.center',
                        ),
                      })}{' '}
                      {translate('sim.fightHelp')}
                    </p>
                  </div>
                )}
                <div className={styles.actionRow}>
                  <BottomActions>
                    {fighting ? (
                      <Button
                        key="reel"
                        data-testid="reel-button"
                        className={`${styles.castButton} ${holding ? styles.holding : ''}`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setHold(true);
                        }}
                        onPointerUp={() => setHold(false)}
                        onPointerCancel={() => setHold(false)}
                        onLostPointerCapture={() => setHold(false)}
                        onKeyDown={(e) => {
                          if (e.code === 'Space' || e.code === 'Enter') {
                            e.preventDefault();
                            setHold(true);
                          }
                        }}
                        onKeyUp={() => setHold(false)}
                        onBlur={() => setHold(false)}
                      >
                        <Anchor size={19} />
                        {holding
                          ? translate('ui.reeling.release.to.relax')
                          : translate('ui.hold.to.reel.in')}
                      </Button>
                    ) : phase === 'BITE' ? (
                      <Button
                        key="hook"
                        data-testid="hook-button"
                        className={`${styles.castButton} ${styles.hookButton}`}
                        loading={busy}
                        onClick={() => void hook()}
                      >
                        <Fish size={19} />
                        {translate('ui.strike.now')}{' '}
                      </Button>
                    ) : ['CAUGHT', 'ESCAPED', 'FINISHED'].includes(phase) ? (
                      <Button
                        key="result"
                        className={styles.castButton}
                        onClick={() => setResultOpen(true)}
                      >
                        {translate('ui.view.result')} <ArrowRight size={17} />
                      </Button>
                    ) : (
                      <Button
                        key="cast"
                        data-testid="cast-button"
                        className={styles.castButton}
                        disabled={
                          busy ||
                          !['IDLE', 'FINISHED'].includes(phase) ||
                          !selectedBait?.quantity ||
                          inventory.isPending ||
                          locations.isPending
                        }
                        loading={busy}
                        onClick={() => void start()}
                      >
                        <Anchor size={18} />
                        {['CASTING', 'WAITING', 'HOOKING'].includes(phase)
                          ? translate('ui.waiting.for.fish')
                          : translate('ui.cast')}
                      </Button>
                    )}
                  </BottomActions>
                  <span className={styles.keyboardHint}>
                    <kbd>SPACE</kbd>
                    {fighting
                      ? translate('ui.hold.release.to.control')
                      : translate('ui.or.tap.the.lake')}
                  </span>
                </div>
                {phase === 'WAITING' && sim && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void hook()}
                  >
                    {translate('sim.earlyStrike')}
                  </Button>
                )}
              </>
            )}
          </div>
        </section>
        <aside
          id="fishing-lakeside"
          className={styles.gameAside}
          hidden={scenery || !lakesideOpen}
        >
          {selectedLocation?.unlocked && (
            <LakeCharacters
              locationId={selectedLocation.id}
              fishing={!!session && session.state !== 'FINISHED'}
              onCharacters={updateCharacters}
            />
          )}
          {selectedLocation?.unlocked && lakesideOpen && (
            <LakeCommunity
              locationId={selectedLocation.id}
              caught={
                lastCaught?.locationId === selectedLocation.id
                  ? lastCaught
                  : undefined
              }
            />
          )}
        </aside>
      </div>
      <Modal
        open={kitOpen}
        onClose={() => setKitOpen(false)}
        title={translate('ui.your.lakeside.kit')}
        footer={
          <Button onClick={() => setKitOpen(false)}>
            {translate('ui.close')}
          </Button>
        }
      >
        <Card className={styles.loadoutCard}>
          <div className={styles.asideTitle}>
            <Anchor size={17} />
            <h3>{translate('ui.your.lakeside.kit')}</h3>
          </div>
          {inventory.error ? (
            <ErrorState
              error={inventory.error}
              retry={() => void inventory.refetch()}
            />
          ) : inventory.isPending ? (
            <LoadingState label={translate('ui.opening.your.bag')} />
          ) : (
            <>
              {inventory.data.items
                .filter((i) => i.equipped)
                .map((i) => (
                  <div key={i.id} className={styles.equippedItem}>
                    <span className={styles.equipmentDot}>
                      <Anchor size={16} />
                    </span>
                    <div>
                      <small>
                        {i.kind === 'ROD'
                          ? translate('ui.rod.2')
                          : i.kind === 'LINE'
                            ? translate('ui.line.2')
                            : translate('ui.hook.2')}
                      </small>
                      <strong>{i.name}</strong>
                    </div>
                    <Check size={13} />
                  </div>
                ))}
              <FormField label={translate('ui.bait.for.the.next.cast')}>
                <Select
                  value={bait}
                  onChange={(e) => setBait(e.target.value)}
                  disabled={active}
                >
                  {inventory.data.items
                    .filter((i) => i.kind === 'BAIT')
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {translate('fishing.baitSummary', {
                          bait: i.name,
                          count: i.quantity,
                        })}
                      </option>
                    ))}
                </Select>
              </FormField>
              {!selectedBait?.quantity && (
                <Notice tone="warning">
                  {translate('ui.you.are.out.of.bait.visit.the')}{' '}
                </Notice>
              )}
              {sim && (
                <p>
                  {translate('sim.lineRating', {
                    value: number(sim.lineStrengthKg, 1),
                  })}
                </p>
              )}
              <Button
                variant="ghost"
                className={styles.asideLink}
                onClick={() =>
                  active ? setLeaveOpen(true) : navigate('/play/inventory')
                }
              >
                {translate('ui.view.bag')} <ArrowRight size={13} />
              </Button>
            </>
          )}
        </Card>
        <Card className={styles.guideCard}>
          <span className={styles.guideIcon}>
            <Leaf size={22} />
          </span>
          <span className="fwo-eyebrow">{translate('ui.a.little.tip')}</span>
          <h3>{translate('ui.take.your.time.you.will.get.there')}</h3>
          <ol>
            <li>{translate('ui.cast.and.wait.for.the.float.to')}</li>
            <li>{translate('ui.a.bite.strike.in.time')}</li>
            <li>{translate('ui.hold.to.reel.release.when.the.line')}</li>
          </ol>
          <p>{translate('ui.do.not.keep.holding.forever.the.line')} </p>
        </Card>
      </Modal>
      <Modal
        open={resultOpen && !!session}
        onClose={() => {
          if (!busy) void finish();
        }}
        title={
          session?.catch
            ? translate('ui.a.new.lakeside.memory')
            : translate('ui.see.you.on.the.next.cast')
        }
        footer={
          <>
            {!sessionExpired && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  await finish();
                  if (!snapshot.current)
                    navigate(
                      session?.catch?.goldDelivery === 'EXCHANGE'
                        ? '/play/inventory?tab=catches'
                        : '/play',
                    );
                }}
              >
                {session?.catch?.goldDelivery === 'EXCHANGE'
                  ? translate('exchange.open')
                  : translate('ui.back.to.lobby.2')}{' '}
              </Button>
            )}
            <Button loading={busy} onClick={() => void finish()}>
              <Anchor size={16} />
              {translate(
                sessionExpired ? 'auth.loginAgain' : 'ui.keep.fishing',
              )}{' '}
            </Button>
          </>
        }
      >
        {session?.catch ? (
          <div className={styles.catchResult} data-testid="catch-result">
            <div className={styles.resultArt}>
              <FishArt
                slug={session.catch.fish.slug}
                imageKey={session.catch.fish.imageKey}
                live
                reducedMotion={prefs.reducedMotion}
              />
            </div>
            <div className={styles.resultBadges}>
              {session.catch.isNewSpecies && (
                <Badge tone="success">{translate('ui.new.species')}</Badge>
              )}
              {session.catch.isRecord && (
                <Badge tone="legendary">{translate('ui.personal.best')}</Badge>
              )}
            </div>
            <h2>{session.catch.fish.name}</h2>
            <strong className={styles.catchWeight}>
              {formatWeight(session.catch.weightG)}
            </strong>
            {session.catch.lengthCm && (
              <p>
                {translate('sim.length', {
                  value: number(session.catch.lengthCm, 1),
                })}
              </p>
            )}
            <p>{session.catch.fish.description}</p>
            <div className={styles.resultRewards}>
              <div>
                <small>
                  {session.catch.goldDelivery === 'EXCHANGE'
                    ? translate('exchange.quote')
                    : translate('ui.gold.earned')}
                </small>
                <CurrencyAmount value={session.catch.gold} />
              </div>
              <div>
                <small>{translate('ui.experience.2')}</small>
                <strong>+{session.catch.xp} XP</strong>
              </div>
            </div>
            <Notice tone="success">
              {session.catch.goldDelivery === 'EXCHANGE'
                ? translate('exchange.caught')
                : translate('ui.added.to.your.collection.gold.and.xp')}{' '}
            </Notice>
          </div>
        ) : (
          <EmptyState
            compact
            title={translate('ui.the.fish.got.away.2')}
            description={
              escapeMessages()[session?.escapeReason ?? ''] ??
              translate('ui.a.little.disappointment.is.part.of.the')
            }
          />
        )}{' '}
        {error && <Notice tone="danger">{error}</Notice>}
        {sessionExpired && (
          <Notice tone="warning">
            {translate('auth.fishingSessionExpired')}
          </Notice>
        )}
      </Modal>
      <Modal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        title={translate('ui.welcome.to.the.lake')}
        footer={
          <Button onClick={() => setTutorialOpen(false)}>
            {translate('ui.i.m.ready')} <Anchor size={16} />
          </Button>
        }
      >
        <div className={styles.tutorialSteps}>
          <div>
            <span>01</span>
            <section>
              <h3>{translate('ui.cast.and.watch.the.float')}</h3>
              <p>{translate('ui.choose.bait.beside.you.then.press.cast')} </p>
            </section>
          </div>
          <div>
            <span>02</span>
            <section>
              <h3>{translate('ui.a.bite.strike.now.2')}</h3>
              <p>{translate('ui.press.strike.or.space.when.the.float')} </p>
            </section>
          </div>
          <div>
            <span>03</span>
            <section>
              <h3>{translate('ui.reel.a.little.release.a.little')}</h3>
              <p>{translate('ui.hold.the.button.or.space.to.reel')} </p>
            </section>
          </div>
        </div>
        <Notice>
          {translate('fishing.musicHint')} {translate('fishing.hapticsHint')}
        </Notice>
      </Modal>
      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={translate('ui.leaving.the.lake.for.a.while')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              {translate('ui.stay.and.fish')}{' '}
            </Button>
            <Button
              onClick={() => {
                setHold(false);
                navigate('/play');
              }}
            >
              {translate('ui.back.to.lobby.2')}{' '}
            </Button>
          </>
        }
      >
        <p>{translate('ui.a.fishing.trip.is.in.progress.leaving')} </p>
      </Modal>
    </>
  );
}
