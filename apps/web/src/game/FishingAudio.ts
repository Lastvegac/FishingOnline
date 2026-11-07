import type { SessionDto, WaterConditions } from '@fwo/contracts';
import { dayPhase, localHour } from '@fwo/ui';

/** Original, seamless pentatonic music. Render once, then let the audio clock loop it. */
function musicBuffer(context: AudioContext) {
  const seconds = 32;
  const buffer = context.createBuffer(
    2,
    context.sampleRate * seconds,
    context.sampleRate,
  );
  const left = buffer.getChannelData(0),
    right = buffer.getChannelData(1);
  const note = (
    midi: number,
    start: number,
    duration: number,
    volume: number,
    pan: number,
  ) => {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const length = Math.floor(duration * context.sampleRate);
    const offset = Math.floor(start * context.sampleRate);
    for (let i = 0; i < length; i++) {
      const t = i / context.sampleRate;
      const envelope =
        Math.min(1, t / 0.04) *
        Math.exp(-t * 1.8) *
        Math.min(1, (duration - t) / 0.3);
      const wave =
        Math.sin(2 * Math.PI * frequency * t) +
        0.22 * Math.sin(2 * Math.PI * frequency * 2 * t) * Math.exp(-t * 2);
      const sample = wave * envelope * volume;
      const index = (offset + i) % left.length;
      left[index] += sample * (1 - pan * 0.4);
      right[index] += sample * (1 + pan * 0.4);
      // A quiet stereo echo gives each pluck space without a streaming asset.
      const echo =
        (index + Math.floor(context.sampleRate * 0.42)) % left.length;
      left[echo] += sample * 0.18 * (1 + pan * 0.4);
      right[echo] += sample * 0.18 * (1 - pan * 0.4);
    }
  };
  const melody = [
    74, 78, 81, 78, 76, 74, 71, 69, 74, 76, 78, 81, 83, 81, 78, 76,
  ];
  melody.forEach((midi, i) => note(midi, i * 2, 3.5, 0.13, Math.sin(i * 2)));
  [50, 47, 55, 57].forEach((midi, i) => {
    note(midi, i * 8, 7, 0.12, -0.3);
    note(midi + 7, i * 8 + 0.7, 6, 0.07, 0.3);
  });
  return buffer;
}

/** One gesture-created context for quiet music, weather, water and tackle sounds. */
export function createFishingAudio() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const music = context.createBufferSource();
  music.buffer = musicBuffer(context);
  music.loop = true;
  const musicGain = context.createGain();
  musicGain.gain.value = 0.7;
  music.connect(musicGain).connect(master);
  const buffer = context.createBuffer(
    1,
    context.sampleRate * 2,
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const wind = context.createBiquadFilter();
  wind.type = 'lowpass';
  wind.frequency.value = 500;
  const water = context.createBiquadFilter();
  water.type = 'bandpass';
  water.frequency.value = 1800;
  water.Q.value = 0.6;
  const windGain = context.createGain();
  windGain.gain.value = 0.03;
  const waterGain = context.createGain();
  waterGain.gain.value = 0.02;
  noise.connect(wind).connect(windGain).connect(master);
  noise.connect(water).connect(waterGain).connect(master);
  const reel = context.createOscillator();
  reel.type = 'triangle';
  reel.frequency.value = 45;
  const reelGain = context.createGain();
  reelGain.gain.value = 0;
  reel.connect(reelGain).connect(master);
  // Spot ambience: surf for coasts, babbling water for streams/rivers, insects by time of day.
  const surfFilter = context.createBiquadFilter();
  surfFilter.type = 'lowpass';
  surfFilter.frequency.value = 450;
  const surfGain = context.createGain();
  surfGain.gain.value = 0;
  const swell = context.createOscillator();
  swell.frequency.value = 0.11;
  const swellDepth = context.createGain();
  swellDepth.gain.value = 0;
  swell.connect(swellDepth).connect(surfGain.gain);
  noise.connect(surfFilter).connect(surfGain).connect(master);
  const babbleFilter = context.createBiquadFilter();
  babbleFilter.type = 'bandpass';
  babbleFilter.frequency.value = 2600;
  babbleFilter.Q.value = 2;
  const babbleGain = context.createGain();
  babbleGain.gain.value = 0;
  const ripple = context.createOscillator();
  ripple.frequency.value = 5.3;
  const rippleDepth = context.createGain();
  rippleDepth.gain.value = 0;
  ripple.connect(rippleDepth).connect(babbleGain.gain);
  noise.connect(babbleFilter).connect(babbleGain).connect(master);
  const insect = context.createOscillator();
  insect.frequency.value = 4400;
  const insectGain = context.createGain();
  insectGain.gain.value = 0;
  const pulse = context.createOscillator();
  pulse.type = 'square';
  pulse.frequency.value = 22;
  const pulseDepth = context.createGain();
  pulseDepth.gain.value = 0;
  pulse.connect(pulseDepth).connect(insectGain.gain);
  insect.connect(insectGain).connect(master);
  noise.start();
  reel.start();
  music.start();
  for (const source of [swell, ripple, insect, pulse]) source.start();
  let previousState = '';
  let previousCue = '';
  let audible = false;
  const chime = (frequencies: number[]) => {
    frequencies.forEach((frequency, i) => {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.connect(gain).connect(master);
      const t = context.currentTime + i * 0.13;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      oscillator.start(t);
      oscillator.stop(t + 0.7);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  };
  const splash = () => {
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(
      350,
      context.currentTime + 0.35,
    );
    gain.gain.setValueAtTime(0.22, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
    source.connect(filter).connect(gain).connect(master);
    source.start();
    source.stop(context.currentTime + 0.45);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  };
  /** Short synthesized wildlife call; nothing is streamed or licensed. */
  const call = (
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    volume: number,
    delay = 0,
  ) => {
    const oscillator = context.createOscillator(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    const t = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, t);
    oscillator.frequency.exponentialRampToValueAtTime(to, t + duration);
    filter.type = 'lowpass';
    filter.frequency.value = Math.max(from, to) * 1.6;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.05);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  };
  let ambience: Pick<WaterConditions, 'environment' | 'hour' | 'weather'> | null =
    null;
  const applyAmbience = () => {
    const t = context.currentTime;
    const environment = ambience?.environment ?? 'FRESHWATER_LAKE';
    const phase = dayPhase(ambience?.hour ?? localHour());
    const night = phase === 'NIGHT' || phase === 'DUSK';
    const wet = ambience?.weather === 'RAIN' || ambience?.weather === 'STORM';
    const surf =
      environment === 'COAST' ? 0.08 : environment === 'BRACKISH' ? 0.035 : 0;
    surfGain.gain.setTargetAtTime(surf * 0.6, t, 1);
    swellDepth.gain.setTargetAtTime(surf * 0.4, t, 1);
    const babble =
      environment === 'STREAM' ? 0.05 : environment === 'RIVER' ? 0.022 : 0;
    babbleFilter.frequency.setTargetAtTime(
      environment === 'RIVER' ? 900 : 2600,
      t,
      1,
    );
    babbleGain.gain.setTargetAtTime(babble * 0.6, t, 1);
    rippleDepth.gain.setTargetAtTime(babble * 0.4, t, 1);
    // Cicadas buzz in the forest by day; crickets chirp everywhere inland at night.
    const insects = wet
      ? 0
      : night && environment !== 'COAST'
        ? 0.007
        : environment === 'DEEP_FOREST' && phase !== 'DAWN'
          ? 0.006
          : 0;
    insect.frequency.setTargetAtTime(night ? 4700 : 4100, t, 1);
    pulse.frequency.setTargetAtTime(night ? 3.4 : 22, t, 1);
    insectGain.gain.setTargetAtTime(insects / 2, t, 1);
    pulseDepth.gain.setTargetAtTime(insects / 2, t, 1);
    musicGain.gain.setTargetAtTime(night ? 0.45 : 0.7, t, 2);
  };
  const wildlife = window.setInterval(() => {
    if (!audible || Math.random() > 0.35) return;
    const environment = ambience?.environment ?? 'FRESHWATER_LAKE';
    const phase = dayPhase(ambience?.hour ?? localHour());
    if (ambience?.weather === 'STORM') return;
    const seaside = environment === 'COAST' || environment === 'BRACKISH';
    if (phase === 'DAY' || phase === 'DAWN' || phase === 'GOLDEN') {
      if (seaside) {
        call('sawtooth', 1150, 700, 0.35, 0.025);
        call('sawtooth', 1050, 650, 0.3, 0.02, 0.45);
      } else {
        const base = 2400 + Math.random() * 900;
        call('sine', base, base * 1.35, 0.09, 0.03);
        call('sine', base * 1.1, base * 1.5, 0.08, 0.025, 0.14);
        if (Math.random() > 0.5) call('sine', base, base * 1.4, 0.1, 0.02, 0.3);
      }
    } else if (environment === 'DEEP_FOREST' && Math.random() > 0.6) {
      call('sine', 400, 360, 0.45, 0.04);
      call('sine', 400, 350, 0.6, 0.04, 0.7);
    } else if (!seaside) {
      for (let i = 0; i < 3; i++) call('sawtooth', 150, 115, 0.12, 0.03, i * 0.17);
    }
  }, 1300);
  return {
    /** Conditions of the selected spot before any cast; the session's own take over once fishing. */
    setAmbience(conditions: WaterConditions | null | undefined) {
      ambience = conditions ?? null;
      applyAmbience();
    },
    enabled(value: boolean) {
      audible = value;
      master.gain.setTargetAtTime(value ? 0.35 : 0, context.currentTime, 0.15);
      if (value) void context.resume().catch(() => {});
      else void context.suspend().catch(() => {});
    },
    update(session: SessionDto | null, held = false) {
      const c = session?.simulator?.conditions;
      if (c && (c.environment !== ambience?.environment || c.hour !== ambience?.hour)) {
        ambience = c;
        applyAmbience();
      }
      const t = context.currentTime;
      const wet = c?.weather === 'RAIN' || c?.weather === 'STORM';
      windGain.gain.setTargetAtTime(0.02 + (c?.windMps ?? 2) * 0.004, t, 0.5);
      waterGain.gain.setTargetAtTime(
        wet
          ? 0.09
          : c?.environment === 'COAST'
            ? 0.06
            : 0.02 + (c?.currentMps ?? 0.1) * 0.04,
        t,
        0.5,
      );
      water.frequency.setTargetAtTime(
        wet ? 3500 : c?.environment === 'COAST' ? 800 : 1800,
        t,
        0.5,
      );
      const fighting =
        session?.state === 'FIGHTING' || session?.state === 'REELING';
      const running = session?.simulator?.cue === 'RUN';
      reelGain.gain.setTargetAtTime(
        fighting && (held || running) ? 0.04 : 0,
        t,
        0.05,
      );
      reel.frequency.setTargetAtTime(
        35 + (session?.tension ?? 0) * 0.9,
        t,
        0.1,
      );
      const state = session?.state ?? '';
      const cue = session?.simulator?.cue ?? 'NONE';
      if (audible && state !== previousState) {
        if (state === 'WAITING' && previousState === 'CASTING') splash();
        if (state === 'BITE') chime([587, 880]);
        if (state === 'HOOKING') chime([392]);
        if (state === 'CAUGHT') chime([587, 740, 880]);
      }
      if (audible && cue !== previousCue && ['DIP', 'NUDGE'].includes(cue))
        splash();
      previousState = state;
      previousCue = cue;
    },
    destroy() {
      window.clearInterval(wildlife);
      noise.stop();
      reel.stop();
      music.stop();
      for (const source of [swell, ripple, insect, pulse]) source.stop();
      void context.close().catch(() => {});
    },
  };
}

/** Haptics are independent of audio and never determine fishing outcomes. */
export function createFishingHaptics() {
  let previousState = '',
    previousCue = '',
    lastPulse = 0;
  const vibrate = (pattern: number | number[]) => {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* Optional device capability. */
    }
  };
  return {
    stop: () => vibrate(0),
    update(session: SessionDto | null, enabled: boolean, held: boolean) {
      const state = session?.state ?? '',
        cue = session?.simulator?.cue ?? 'NONE';
      if (enabled && document.visibilityState === 'visible') {
        const now = performance.now();
        if (state === 'BITE' && state !== previousState) vibrate([45, 65, 80]);
        else if (state === 'CAUGHT' && state !== previousState)
          vibrate([35, 60, 35]);
        else if (state === 'ESCAPED' && state !== previousState) vibrate(65);
        else if (state === 'FIGHTING' || state === 'REELING') {
          if ((held || cue === 'RUN') && now - lastPulse > 750) {
            vibrate((session?.tension ?? 0) > 70 ? [25, 45, 25] : 15);
            lastPulse = now;
          }
        } else if (cue !== previousCue && ['NUDGE', 'DIP'].includes(cue))
          vibrate(cue === 'DIP' ? 25 : 12);
      }
      previousState = state;
      previousCue = cue;
    },
  };
}
