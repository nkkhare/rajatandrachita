// Background music in two phases: the tap that opens the envelope starts the
// song at 0:00, it plays on through the reveal, and from 0:15 only the 0:05–
// 0:15 phrase loops, so the introduction never repeats. The loop is
// sample-accurate (AudioBufferSourceNode loop points) and a short equal-power
// crossfade is baked into the phrase's last moments so the jump back to 0:05
// has no audible seam.
export const MUSIC_URL = `${import.meta.env.BASE_URL}music/save-the-date.m4a`;

const LOOP_START = 5;
const LOOP_END = 15;
const CROSSFADE_SECONDS = 0.08;
const VOLUME = 0.8;
const FADE_SECONDS = 0.35;

type AudioContextConstructor = typeof AudioContext;

/** Blends the audio leading into LOOP_START over the end of the phrase. */
export function prepareLoop(buffer: AudioBuffer, loopStart = LOOP_START, loopEnd = LOOP_END) {
  const rate = buffer.sampleRate;
  const fade = Math.round(CROSSFADE_SECONDS * rate);
  const end = Math.round(loopEnd * rate);
  const start = Math.round(loopStart * rate);
  if (end > buffer.length || start < fade) return;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < fade; i++) {
      const t = (i + 0.5) / fade;
      const tail = data[end - fade + i];
      const lead = data[start - fade + i];
      data[end - fade + i] = tail * Math.cos(t * Math.PI / 2) + lead * Math.sin(t * Math.PI / 2);
    }
  }
}

/** Plays the buffer from `offset`, running into the loop and never back to 0. */
export function startSegmentLoop(
  context: BaseAudioContext,
  buffer: AudioBuffer,
  destination: AudioNode,
  when: number,
  offset: number,
) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = LOOP_START;
  source.loopEnd = Math.min(LOOP_END, buffer.duration);
  source.connect(destination);
  const position = offset < source.loopEnd
    ? offset
    : LOOP_START + ((offset - LOOP_START) % (source.loopEnd - LOOP_START));
  source.start(when, position);
  return source;
}

export class Soundtrack {
  private bytes: Promise<ArrayBuffer | null>;
  private context?: AudioContext;
  private gain?: GainNode;
  private source?: AudioBufferSourceNode;
  private started = false;
  private muted = false;
  private listeners = new Set<() => void>();
  available = false;

  constructor(url = MUSIC_URL) {
    // Fetch early so the tap can start the music without waiting on the network.
    this.bytes = fetch(url)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  get isMuted() { return this.muted; }

  private notify() { this.listeners.forEach((listener) => listener()); }

  /** Call synchronously from the guest's tap, so browsers allow playback. */
  start() {
    if (this.started) return;
    this.started = true;
    const Context = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!Context) return;
    // Lets iOS play through the silent switch, like a media player.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';

    const context = new Context();
    this.context = context;
    const gain = context.createGain();
    gain.gain.value = this.muted ? 0 : VOLUME;
    gain.connect(context.destination);
    this.gain = gain;
    void context.resume();
    const tappedAt = performance.now();

    void this.bytes.then(async (bytes) => {
      if (!bytes || context.state === 'closed') return;
      const buffer = await context.decodeAudioData(bytes.slice(0));
      prepareLoop(buffer);
      // Keep the music in step with the envelope even if decoding took a moment.
      const offset = (performance.now() - tappedAt) / 1000;
      this.source = startSegmentLoop(context, buffer, gain, context.currentTime, offset);
      this.available = true;
      this.notify();
    }).catch(() => undefined);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    const { context, gain } = this;
    if (context && gain) {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(muted ? 0 : VOLUME, now + FADE_SECONDS);
      if (!muted) void context.resume();
    }
    this.notify();
  }

  private onVisibility = () => {
    const context = this.context;
    if (!context || context.state === 'closed') return;
    if (document.hidden) void context.suspend();
    else void context.resume();
  };

  dispose() {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.source?.stop();
    void this.context?.close();
  }
}
