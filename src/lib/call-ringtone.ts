/**
 * Tiny, asset-free call tones. AudioContext is deliberately created only from
 * enable(), which is expected to be called from a click/tap. Browsers are
 * allowed to reject it; callers can expose that state instead of pretending a
 * ringtone is playing.
 */
export class CallRingtone {
  private static readonly AUDIBLE_GAIN = 0.18;
  private context: AudioContext | null = null;
  private timer: number | null = null;
  private delayedBeeps = new Set<number>();
  private oscillators = new Set<OscillatorNode>();

  async enable(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const AudioContextCtor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return false;
    try {
      this.context ??= new AudioContextCtor();
      await this.context.resume();
      return this.context.state === "running";
    } catch {
      return false;
    }
  }

  private beep(frequency: number, durationMs: number) {
    const context = this.context;
    if (!context || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    // Loud enough to be useful on mobile speakers, while remaining well below
    // full-scale gain to avoid clipping and startling volume spikes.
    gain.gain.exponentialRampToValueAtTime(CallRingtone.AUDIBLE_GAIN, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationMs / 1000);
    oscillator.connect(gain).connect(context.destination);
    this.oscillators.add(oscillator);
    oscillator.addEventListener("ended", () => this.oscillators.delete(oscillator), { once: true });
    oscillator.start();
    oscillator.stop(context.currentTime + durationMs / 1000 + 0.02);
  }

  start(kind: "incoming" | "ringback"): boolean {
    this.stop();
    if (!this.context || this.context.state !== "running") return false;
    const play = () => {
      if (kind === "incoming") {
        this.beep(880, 150);
        const delayed = window.setTimeout(() => {
          this.delayedBeeps.delete(delayed);
          this.beep(1_100, 150);
        }, 190);
        this.delayedBeeps.add(delayed);
      } else {
        this.beep(440, 260);
      }
    };
    play();
    this.timer = window.setInterval(play, kind === "incoming" ? 2_300 : 3_000);
    return true;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.delayedBeeps.forEach(timer => clearTimeout(timer));
    this.delayedBeeps.clear();
    this.oscillators.forEach(oscillator => {
      try { oscillator.stop(); } catch { /* oscillator was already stopped */ }
    });
    this.oscillators.clear();
  }

  async close() {
    this.stop();
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") {
      try { await context.close(); } catch { /* browser already closed it */ }
    }
  }
}