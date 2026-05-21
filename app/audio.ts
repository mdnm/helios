"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "helios.audio.muted";
const AMBIENT_SRC = "/audio/beach-ambient.mp3";
const AMBIENT_TARGET_VOLUME = 0.5;
// Short fade-in so a quick press-release on the opening screen still gives
// the user audible ambient before the fade-out begins on click.
const AMBIENT_FADE_IN_MS = 120;

type Listener = () => void;

class AudioManager {
  private ctx: AudioContext | null = null;
  private ambient: HTMLAudioElement | null = null;
  // Logical volume the ambient *wants* to be at (ignoring mute). Mute then
  // multiplies by 0 when applied to the element. Keeping these separate lets
  // the mute toggle silence audio without ever restarting the ambient — the
  // ambient's lifecycle is owned exclusively by playAmbient / fadeOutAmbient.
  private ambientLogicalVolume = 0;
  private masterGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private muted = false;
  private initialized = false;
  private rampToken = 0;
  private listeners = new Set<Listener>();

  private initFromEnv() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    let initial = false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        initial = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } else {
        initial = stored === "true";
      }
    } catch {
      initial = false;
    }
    this.muted = initial;
  }

  isMuted(): boolean {
    this.initFromEnv();
    return this.muted;
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) cb();
  }

  /** Unlock the AudioContext. Must be called from a user gesture. */
  unlock(): void {
    this.initFromEnv();
    if (this.ctx) {
      console.debug("[helios audio] unlock — ctx already exists, state:", this.ctx.state);
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    console.debug("[helios audio] unlock — creating AudioContext, muted:", this.muted);
    type Ctor = typeof AudioContext;
    const W = window as unknown as {
      AudioContext?: Ctor;
      webkitAudioContext?: Ctor;
    };
    const C = W.AudioContext ?? W.webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.delay = ctx.createDelay(0.5);
    this.delay.delayTime.value = 0.15;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.25;
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);
  }

  /** Start the looping ambient (idempotent). Fades in to target volume. */
  playAmbient(): void {
    this.initFromEnv();
    if (typeof window === "undefined") return;
    if (!this.ambient) {
      const a = new Audio(AMBIENT_SRC);
      a.loop = true;
      a.preload = "auto";
      a.volume = 0;
      this.ambient = a;
      console.debug("[helios audio] created ambient element", AMBIENT_SRC);
    }
    const a = this.ambient;
    console.debug("[helios audio] playAmbient", {
      muted: this.muted,
      paused: a.paused,
      readyState: a.readyState,
      currentSrc: a.currentSrc,
    });
    void a.play().then(
      () => console.debug("[helios audio] ambient.play() resolved"),
      (err) => console.warn("[helios audio] ambient.play() rejected:", err.name, err.message),
    );
    this.rampAmbient(AMBIENT_TARGET_VOLUME, AMBIENT_FADE_IN_MS);
  }

  fadeOutAmbient(ms: number): void {
    if (!this.ambient) return;
    const a = this.ambient;
    this.rampAmbient(0, ms, () => {
      try {
        a.pause();
      } catch {}
    });
  }

  private rampAmbient(to: number, ms: number, done?: () => void): void {
    // Bump the token so any in-flight ramp self-cancels on its next tick.
    // Without this, a fade-out fired right after a fade-in (e.g., user
    // press-then-release on the opening screen) races with the fade-in,
    // captures `from = 0` before the fade-in has progressed, and snaps the
    // ambient to 0 — making it inaudible.
    this.rampToken++;
    const myToken = this.rampToken;
    const from = this.ambientLogicalVolume;
    const start = performance.now();
    const step = (t: number) => {
      if (myToken !== this.rampToken) return;
      const p = Math.min(1, (t - start) / ms);
      this.ambientLogicalVolume = Math.max(
        0,
        Math.min(1, from + (to - from) * p),
      );
      this.applyAmbientVolume();
      if (p < 1) requestAnimationFrame(step);
      else if (done) done();
    };
    requestAnimationFrame(step);
  }

  private applyAmbientVolume(): void {
    if (!this.ambient) return;
    this.ambient.volume = this.muted ? 0 : this.ambientLogicalVolume;
  }

  /**
   * Synthesized unveiling cue — a single swelling chord, not an arpeggio,
   * so it reads as "a curtain rising" rather than "a notification ding."
   *
   * Voicing: stacked fifths C4 – G4 – D5. Stacked fifths are open and
   * ambiguous (neither clearly major nor minor) — they feel spacious and
   * inviting, the same trick used in film studio idents. Each voice is a
   * sine fundamental with a subtle 2× partial for warmth.
   *
   * Envelope: 250 ms swell-in (no hard attack), brief sustain, ~500 ms
   * release. A higher C6 shimmer fades in over the first 500 ms — that's
   * the "thing being unveiled" sitting on top of the chord. Total ~1.2 s.
   * Requires unlock() to have been called first.
   */
  playBling(): void {
    if (!this.ctx || !this.masterGain || !this.delay) return;
    if (this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 1.2;

    // Shared master envelope: gentle swell + smooth release.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.25, now + 0.25);
    env.gain.linearRampToValueAtTime(0.22, now + 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    env.connect(this.masterGain);
    env.connect(this.delay);

    const notes = [
      { freq: 261.63, gain: 0.6 }, // C4
      { freq: 392.0, gain: 0.5 }, // G4
      { freq: 587.33, gain: 0.4 }, // D5 (ninth — opens the chord)
    ];
    for (const n of notes) {
      const o1 = ctx.createOscillator();
      o1.type = "sine";
      o1.frequency.value = n.freq;
      const g1 = ctx.createGain();
      g1.gain.value = n.gain;
      o1.connect(g1);
      g1.connect(env);
      o1.start(now);
      o1.stop(now + dur + 0.05);
      // Soft octave partial for warmth — gentle enough that it doesn't read
      // as a separate tone, just thickens the body.
      const o2 = ctx.createOscillator();
      o2.type = "sine";
      o2.frequency.value = n.freq * 2;
      const g2 = ctx.createGain();
      g2.gain.value = n.gain * 0.15;
      o2.connect(g2);
      g2.connect(env);
      o2.start(now);
      o2.stop(now + dur + 0.05);
    }

    // C6 shimmer blooms in over 500 ms — the unveiling moment.
    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = 1046.5;
    const shG = ctx.createGain();
    shG.gain.setValueAtTime(0, now);
    shG.gain.linearRampToValueAtTime(0.12, now + 0.5);
    shG.gain.exponentialRampToValueAtTime(0.001, now + dur);
    shimmer.connect(shG);
    shG.connect(env);
    shimmer.start(now);
    shimmer.stop(now + dur + 0.05);
  }

  setMuted(muted: boolean): void {
    this.initFromEnv();
    this.muted = muted;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
      } catch {}
    }
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.2);
    }
    // Mute only silences. It never starts or stops the ambient — that's owned
    // exclusively by the opening-screen lifecycle (playAmbient / fadeOutAmbient).
    this.applyAmbientVolume();
    this.notify();
  }
}

let _mgr: AudioManager | null = null;
function mgr(): AudioManager {
  if (!_mgr) _mgr = new AudioManager();
  return _mgr;
}

export const audio = {
  unlock: () => mgr().unlock(),
  playAmbient: () => mgr().playAmbient(),
  fadeOutAmbient: (ms: number) => mgr().fadeOutAmbient(ms),
  playBling: () => mgr().playBling(),
  setMuted: (muted: boolean) => mgr().setMuted(muted),
  isMuted: () => mgr().isMuted(),
  subscribe: (cb: () => void) => mgr().subscribe(cb),
};

export function useMuted(): boolean {
  return useSyncExternalStore(
    (cb) => audio.subscribe(cb),
    () => audio.isMuted(),
    () => true,
  );
}
