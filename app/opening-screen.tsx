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
    // Try to start the ambient immediately. On returns to the opening screen
    // the AudioContext is already unlocked from a prior gesture, so this just
    // works. On the very first visit, browser autoplay policy will reject the
    // play() promise — we catch silently inside playAmbient and the gesture
    // listener below picks up the next pointer/key press.
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
    <main
      ref={screenRef}
      className="screen opening-screen"
      onClick={onWake}
      role="button"
      tabIndex={0}
      aria-label="Wake Helios"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onWake();
      }}
    >
      <div className="warm-sky" aria-hidden="true" />
      <Horizon />
      <div className="opening-mark">
        <div
          className="sun-slot sun-slot-opening"
          style={{ width: OPENING_SIZE, height: OPENING_SIZE }}
          aria-hidden="true"
        />
        <span className="sr-only">Helios</span>
      </div>
      <MuteToggle variant="opening" />
    </main>
  );
}
