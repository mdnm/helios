"use client";

import { useEffect, useRef } from "react";
import { Horizon } from "./horizon";
import { audio } from "./audio";
import { MuteToggle } from "./mute-toggle";

const OPENING_SIZE = 340;

export function OpeningScreen({ onWake }: { onWake: () => void }) {
  const screenRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    // Try immediately. Works on returns to the opening screen (AudioContext
    // already unlocked from a prior gesture). On the very first visit the
    // browser will reject autoplay — the gesture listener below picks it up.
    audio.playAmbient();
    const onFirstGesture = () => {
      audio.unlock();
      audio.playAmbient();
    };
    el.addEventListener("pointerdown", onFirstGesture, { once: true });
    el.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      el.removeEventListener("pointerdown", onFirstGesture);
      el.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  return (
    <main ref={screenRef} className="screen opening-screen">
      <div className="warm-sky" aria-hidden="true" />
      <Horizon />
      <div className="opening-mark" aria-hidden="true">
        <div
          className="sun-slot sun-slot-opening"
          style={{ width: OPENING_SIZE, height: OPENING_SIZE }}
        />
      </div>
      {/* Full-bleed wake target sits above the warm-sky / horizon so any
          click anywhere wakes Helios. Keyboard users land on it via Tab. */}
      <button
        type="button"
        className="wake-target"
        onClick={onWake}
        aria-label="Wake Helios"
      />
      <MuteToggle variant="opening" />
    </main>
  );
}
