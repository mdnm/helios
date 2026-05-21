"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { audio, useMuted } from "./audio";
import { Icon } from "./icons";

export function MuteToggle({ variant }: { variant: "opening" | "app" }) {
  const muted = useMuted();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    audio.unlock();
    audio.setMuted(!muted);
  };

  return (
    <button
      type="button"
      className={`mute-toggle mute-toggle-${variant}`}
      onClick={onClick}
      aria-label={muted ? "Unmute" : "Mute"}
      aria-pressed={muted}
    >
      {muted ? <Icon.SpeakerOff /> : <Icon.Speaker />}
    </button>
  );
}
