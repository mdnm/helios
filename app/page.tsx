"use client";

import { useChat } from "@ai-sdk/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import { HeliosSun } from "./helios-sun";
import { OpeningScreen } from "./opening-screen";
import { EndingScreen } from "./ending-screen";
import { compressIfNeeded, MAX_IMAGE_BYTES } from "./compress";
import { Icon } from "./icons";
import { log, warn } from "./log";
import { audio } from "./audio";
import { MuteToggle } from "./mute-toggle";

const SUN_BASE = 340;
const HERO_SIZE = 168;
const CORNER_SIZE = 40;
const SCREEN_SEQUENCE = ["opening", "app", "ending"] as const;

type Screen = (typeof SCREEN_SEQUENCE)[number];
type Phase = "hero" | "chat";
type SunPhase = "idle" | "fade-in" | "loading" | "fade-out";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const SUGGESTIONS = [
  { icon: <Icon.Sun />, t: "Is my balcony good for solar?" },
  { icon: <Icon.Euro />, t: "Show me products under €500" },
  { icon: <Icon.Home />, t: "Estimate my savings" },
  { icon: <Icon.Mail />, t: "Draft my landlord letter" },
];

export default function Chat() {
  const { messages, sendMessage, status, setMessages } = useChat();
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [prepareLabel, setPrepareLabel] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("opening");
  const [phase, setPhase] = useState<Phase>("hero");
  const [sunPhase, setSunPhase] = useState<SunPhase>("idle");
  const [dragDepth, setDragDepth] = useState(0);
  const [appLeaving, setAppLeaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const sunRectRef = useRef<{ left: number; top: number; width: number } | null>(
    null,
  );
  const prevScreenRef = useRef<Screen>("opening");
  const prevPhaseRef = useRef<Phase>("hero");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sunPhaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAnimRef = useRef<Animation | null>(null);
  const latestTargetRef = useRef<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  // True while the first-send arc is animating. Resize-driven re-targets
  // (composer slide, textarea autosize) must not start a competing straight
  // animation that would replace the arc with an L-shaped path.
  const arcInFlightRef = useRef(false);
  const isDragging = dragDepth > 0;

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    log("chat.status", { status, messages: messages.length });
  }, [status, messages.length]);

  const inChat = phase !== "hero" || messages.length > 0;
  const composerSlid = phase === "chat";
  const canEnd = phase === "chat" && messages.length > 0 && !isBusy;

  // Drive the four-state sun phase machine off chat busy-ness.
  useEffect(() => {
    if (sunPhaseTimerRef.current) clearTimeout(sunPhaseTimerRef.current);
    if (isBusy) {
      setSunPhase("fade-in");
      sunPhaseTimerRef.current = setTimeout(() => setSunPhase("loading"), 1300);
    } else if (sunPhase === "loading" || sunPhase === "fade-in") {
      setSunPhase("fade-out");
      sunPhaseTimerRef.current = setTimeout(() => setSunPhase("idle"), 1300);
    }
    return () => {
      if (sunPhaseTimerRef.current) clearTimeout(sunPhaseTimerRef.current);
    };
    // sunPhase intentionally not in deps — we read it but don't want a feedback loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusy]);

  // FLIP shared-sun: find the active slot, then animate the persistent sun to it.
  const findActiveSlot = useCallback((): HTMLElement | null => {
    const s = stageRef.current;
    if (!s) return null;
    if (screen === "opening") return s.querySelector(".sun-slot-opening");
    if (screen === "ending") return s.querySelector(".sun-slot-ending");
    if (phase === "hero") return s.querySelector(".sun-slot-app-hero");
    return (
      s.querySelector(".sun-slot-app-corner") ||
      s.querySelector(".sun-slot-app-hero")
    );
  }, [screen, phase]);

  const transformFor = (rect: { left: number; top: number; width: number }) =>
    `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / SUN_BASE})`;

  const place = useCallback(
    (rect: { left: number; top: number; width: number }) => {
      const sun = sunRef.current;
      if (!sun) return;
      sun.style.transform = transformFor(rect);
      sunRectRef.current = { left: rect.left, top: rect.top, width: rect.width };
    },
    [],
  );

  const animateSun = useCallback(
    (
      target: { left: number; top: number; width: number },
      opts: { duration?: number; easing?: string; arc?: boolean } = {},
    ): Promise<void> => {
      const duration = opts.duration ?? 800;
      const easing = opts.easing ?? "cubic-bezier(0.32, 0.72, 0.24, 1)";
      const arc = opts.arc ?? false;
      const sun = sunRef.current;
      const prev = sunRectRef.current;
      if (!sun || !prev) {
        place(target);
        return Promise.resolve();
      }
      // Skip duplicate redirects when the target hasn't actually moved.
      // Without this, a ResizeObserver firing every frame during the
      // composer-expand animation queues 60+ short animations per second.
      const latest = latestTargetRef.current;
      if (
        latest &&
        Math.abs(target.left - latest.left) < 0.5 &&
        Math.abs(target.top - latest.top) < 0.5 &&
        Math.abs(target.width - latest.width) < 0.5
      ) {
        return Promise.resolve();
      }
      latestTargetRef.current = target;
      // If an animation is already in flight, start the new one from the
      // sun's *current visual* transform — not from the last placed rect.
      // Otherwise every redirect snaps the sun back to its origin and the
      // long opening→app glide gets stuck until the cascade ends.
      const running = currentAnimRef.current;
      const isMidFlight =
        running && (running.playState === "running" || running.playState === "paused");
      const fromTransform = isMidFlight
        ? getComputedStyle(sun).transform
        : transformFor(prev);
      let keyframes: Keyframe[];
      if (arc) {
        const apex = {
          left: (prev.left + target.left) / 2,
          top: Math.min(prev.top, target.top) - 170,
          width: (prev.width + target.width) / 2 + 60,
        };
        keyframes = [
          { transform: fromTransform, offset: 0 },
          { transform: transformFor(apex), offset: 0.55 },
          { transform: transformFor(target), offset: 1 },
        ];
      } else {
        keyframes = [
          { transform: fromTransform },
          { transform: transformFor(target) },
        ];
      }
      return new Promise((resolve) => {
        currentAnimRef.current?.cancel();
        const anim = sun.animate(keyframes, {
          duration,
          easing,
          fill: "forwards",
        });
        currentAnimRef.current = anim;
        anim.finished
          .then(() => {
            place(target);
            anim.cancel();
            if (currentAnimRef.current === anim) currentAnimRef.current = null;
            resolve();
          })
          .catch(() => resolve());
      });
    },
    [place],
  );

  // Settle the sun into the active slot whenever the screen or phase changes.
  // We deliberately do NOT re-fire on messages.length / isBusy — the avatar's
  // bottom is anchored to chat-region's bottom via flex-end + bottom-anchored
  // chat-inner, so once the arc lands on the first send, the position is
  // stable for the rest of the conversation.
  useLayoutEffect(() => {
    // Snap chat to bottom *before* measuring, so the latest avatar's rect
    // reflects its final post-scroll viewport position.
    const scrollEl = scrollRef.current;
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    const slot = findActiveSlot();
    if (!slot) return;
    const target = slot.getBoundingClientRect();
    if (!sunRectRef.current) {
      place(target);
      return;
    }
    const from = prevScreenRef.current;
    const fromPhase = prevPhaseRef.current;
    let duration = 800;
    let easing = "cubic-bezier(0.32, 0.72, 0.24, 1)";
    let arc = false;
    if (from === "opening" && screen === "app") {
      duration = 1600;
      easing = "cubic-bezier(0.22, 0.65, 0.18, 1)";
    } else if (from === "app" && screen === "ending") {
      duration = 1100;
    } else if (from !== screen) {
      duration = 1000;
    } else if (fromPhase === "hero" && phase === "chat") {
      // First send: arc from hero centerpiece to the corner anchor.
      duration = 1700;
      easing = "cubic-bezier(0.35, 0, 0.35, 1)";
      arc = true;
    }
    if (arc) {
      arcInFlightRef.current = true;
      animateSun(target, { duration, easing, arc }).finally(() => {
        arcInFlightRef.current = false;
      });
    } else {
      animateSun(target, { duration, easing });
    }
    prevScreenRef.current = screen;
    prevPhaseRef.current = phase;
  }, [screen, phase, findActiveSlot, animateSun, place]);

  useEffect(() => {
    const onResize = () => {
      if (arcInFlightRef.current) return;
      const slot = findActiveSlot();
      if (slot) {
        animateSun(slot.getBoundingClientRect(), {
          duration: 280,
          easing: "cubic-bezier(0.32, 0.72, 0.24, 1)",
        });
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [findActiveSlot, animateSun]);

  // Keep --composer-height in sync, and glide the sun to the active slot when
  // the composer resizes (e.g. textarea autosize shifts the avatar position).
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const screenEl = el.closest(".app-screen") as HTMLElement | null;
    const update = () => {
      const h = el.offsetHeight;
      if (screenEl) screenEl.style.setProperty("--composer-height", `${h}px`);
      // While the first-send arc is running, don't start a competing
      // straight-line animation — the arc would degrade into an L-shape.
      if (arcInFlightRef.current) return;
      const slot = findActiveSlot();
      if (slot) {
        animateSun(slot.getBoundingClientRect(), {
          duration: 280,
          easing: "cubic-bezier(0.32, 0.72, 0.24, 1)",
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [findActiveSlot, animateSun]);

  // Autosize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(180, Math.max(28, ta.scrollHeight)) + "px";
  }, [input]);

  const attachFiles = useCallback(async (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    log("attach.incoming", {
      count: arr.length,
      items: arr.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    });
    if (arr.length === 0) return false;
    let candidate = arr[0];

    if (!ALLOWED_TYPES.has(candidate.type)) {
      log("attach.rejected.unsupported", {
        name: candidate.name,
        type: candidate.type,
      });
      setAttachError(
        `${candidate.name} isn't supported. Use JPEG, PNG, GIF, or WebP.`,
      );
      return false;
    }

    if (candidate.size > MAX_IMAGE_BYTES) {
      log("attach.oversized", {
        size: candidate.size,
        max: MAX_IMAGE_BYTES,
      });
      setPrepareLabel("Compressing");
      setAttachError(null);
      try {
        candidate = await compressIfNeeded(candidate);
      } catch (err) {
        warn("attach.compress.failed", err);
        setAttachError(
          `Couldn't compress ${candidate.name}. Try a smaller image.`,
        );
        setPrepareLabel(null);
        return false;
      }
      setPrepareLabel(null);
    }

    if (candidate.size > MAX_IMAGE_BYTES) {
      log("attach.rejected.oversized", { size: candidate.size });
      setAttachError(
        `Couldn't get ${candidate.name} below 5MB. Try a smaller image.`,
      );
      return false;
    }

    const dt = new DataTransfer();
    dt.items.add(candidate);
    setFiles(dt.files);
    setAttachError(null);
    log("attach.accepted", {
      name: candidate.name,
      type: candidate.type,
      size: candidate.size,
    });
    return true;
  }, []);

  const clearAttachment = useCallback(() => {
    setFiles(undefined);
    setAttachError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!attachError) return;
    const id = setTimeout(() => setAttachError(null), 5000);
    return () => clearTimeout(id);
  }, [attachError]);

  const filePreview = useMemo(() => {
    if (!files || !files[0]) return null;
    return URL.createObjectURL(files[0]);
  }, [files]);
  useEffect(() => {
    if (!filePreview) return;
    return () => URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setDragDepth((d) => {
      const next = d + 1;
      if (d === 0) log("drag.enter");
      return next;
    });
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setDragDepth((d) => {
      const next = Math.max(0, d - 1);
      if (next === 0) log("drag.leave");
      return next;
    });
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      log("drag.drop", { count: e.dataTransfer.files.length });
      setDragDepth(0);
      void attachFiles(e.dataTransfer.files);
    },
    [attachFiles],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;
      const images: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) images.push(f);
        }
      }
      if (images.length === 0) return;
      e.preventDefault();
      log("paste.image", {
        count: images.length,
        types: images.map((f) => f.type),
      });
      void attachFiles(images);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [attachFiles]);

  const handleSend = useCallback(
    (override?: string) => {
      const text = (override ?? input).trim();
      if (!text && !files) {
        log("send.skipped.empty");
        return;
      }
      if (isBusy) {
        log("send.skipped.busy", { isBusy, phase });
        return;
      }

      const isFirst = phase === "hero";
      log("send.start", {
        textLen: text.length,
        hasFiles: !!files,
        isFirst,
      });
      sendMessage({ text, files });
      log("send.dispatched");
      setInput("");
      clearAttachment();

      if (isFirst) {
        setPhase("chat");
        log("phase.chat");
      }
    },
    [input, files, isBusy, phase, sendMessage, clearAttachment],
  );

  const goto = useCallback(
    async (next: Screen) => {
      if (next === screen) return;
      log("screen.goto", { from: screen, to: next });
      if (next === "app") {
        setMessages([]);
        setInput("");
        clearAttachment();
        setPhase("hero");
      }
      // Play composer collapse before unmounting the app screen.
      if (screen === "app" && next !== "app") {
        setAppLeaving(true);
        await new Promise((r) => setTimeout(r, 500));
        setAppLeaving(false);
      }
      setScreen(next);
    },
    [screen, setMessages, clearAttachment],
  );

  // Cmd/Ctrl + ArrowLeft/Right walks the screen sequence. Capture phase so we
  // win over the autofocused textarea (which would otherwise consume the key
  // as a line-start/end caret jump).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const idx = SCREEN_SEQUENCE.indexOf(screen);
      const nextIdx = e.key === "ArrowRight" ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= SCREEN_SEQUENCE.length) return;
      e.preventDefault();
      goto(SCREEN_SEQUENCE[nextIdx]);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [screen, goto]);

  return (
    <div
      ref={stageRef}
      className={`stage stage-${screen}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        ref={sunRef}
        className={`shared-sun screen-${screen} phase-${phase}`}
        style={{ width: SUN_BASE, height: SUN_BASE }}
      >
        <HeliosSun state={sunPhase} />
      </div>

      {screen === "opening" && (
        <OpeningScreen
          onWake={() => {
            audio.unlock();
            audio.playBling();
            // Long enough that the waves are clearly audible tailing off as
            // the sun begins its glide, fully silent by the time it lands.
            audio.fadeOutAmbient(900);
            goto("app");
          }}
        />
      )}

      {screen === "app" && (
        <div
          className={`screen app-screen ${composerSlid ? "in-chat" : ""}${
            appLeaving ? " leaving" : ""
          }`}
        >
          <div className="ambient" />
          {isDragging && (
            <div className="drop-overlay" aria-hidden="true">
              <div className="drop-card">
                <Icon.Attach />
                <p>Drop image to attach</p>
              </div>
            </div>
          )}

          <header className="head">
            <span className="wordmark">Helios</span>
            <MuteToggle variant="app" />
          </header>

          <div className="chat-region" ref={scrollRef}>
            <div className="chat-inner">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`msg ${message.role === "user" ? "user" : "ai"}`}
                >
                  {message.role === "assistant" && (
                    <div
                      className="ai-avatar"
                      style={{ width: CORNER_SIZE, height: CORNER_SIZE }}
                    />
                  )}
                  <div className="body">
                    {message.role === "assistant" && <div className="who">Helios</div>}
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        return message.role === "assistant" ? (
                          <ReactMarkdown key={`${message.id}-${i}`}>
                            {part.text}
                          </ReactMarkdown>
                        ) : (
                          <p key={`${message.id}-${i}`} style={{ whiteSpace: "pre-wrap" }}>
                            {part.text}
                          </p>
                        );
                      }
                      if (
                        part.type === "file" &&
                        part.mediaType?.startsWith("image/")
                      ) {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={`${message.id}-${i}`}
                            src={part.url}
                            alt="Uploaded"
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}

              {isBusy &&
                messages.length > 0 &&
                messages[messages.length - 1].role === "user" && (
                  <div className="msg ai">
                    <div
                      className="ai-avatar"
                      style={{ width: CORNER_SIZE, height: CORNER_SIZE }}
                    />
                    <div className="body">
                      <div className="who">Helios</div>
                      <div className="thinking">
                        Thinking
                        <span className="dots">
                          <span>.</span>
                          <span>.</span>
                          <span>.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {phase === "chat" && (
            <div
              className="sun-slot sun-slot-app-corner"
              style={{ width: CORNER_SIZE, height: CORNER_SIZE }}
            />
          )}

          <div ref={composerRef} className="composer-region">
            {phase === "hero" && (
              <div
                className="sun-slot sun-slot-app-hero"
                style={{ width: HERO_SIZE, height: HERO_SIZE }}
              />
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <div className="composer">
                {attachError && (
                  <div className="attach-error" role="alert">
                    {attachError}
                  </div>
                )}
                {prepareLabel && (
                  <div className="attachment-preview converting">
                    <div className="thumb-placeholder" />
                    <span className="name">
                      {prepareLabel}
                      <span className="dots">
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                      </span>
                    </span>
                  </div>
                )}
                {!prepareLabel && files && files[0] && (
                  <div className="attachment-preview">
                    {filePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={filePreview} alt="" className="thumb" />
                    )}
                    <span className="name" title={files[0].name}>
                      {files[0].name}
                    </span>
                    <button
                      type="button"
                      className="remove"
                      onClick={clearAttachment}
                      aria-label="Remove attachment"
                    >
                      <Icon.X />
                    </button>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Ask Helios about your Balkonkraftwerk…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isBusy}
                  autoFocus
                />
                <div className="composer-row">
                  <label
                    className={`attach-label ${files ? "has-file" : ""}`}
                    title="Attach image"
                  >
                    <Icon.Attach />
                    Attach
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          void attachFiles(e.target.files);
                        }
                        e.target.value = "";
                      }}
                      ref={fileInputRef}
                    />
                  </label>
                  <div className="spacer" />
                  <button
                    type="button"
                    className="tool-btn"
                    title="Voice (coming soon)"
                    disabled
                  >
                    <Icon.Mic />
                  </button>
                  <button
                    type="submit"
                    className="send-btn"
                    disabled={
                      isBusy ||
                      prepareLabel !== null ||
                      (!input.trim() && !files)
                    }
                    aria-label="Send"
                  >
                    <Icon.Send />
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className={`suggest-region ${inChat ? "hidden" : ""}`}>
            <div className="suggest">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleSend(s.t)}>
                  {s.icon}
                  {s.t}
                </button>
              ))}
            </div>
            <div className="foot-note">
              Helios may make mistakes. Verify before automating.
            </div>
          </div>

          {canEnd && (
            <button className="end-btn" onClick={() => goto("ending")}>
              End conversation <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      )}

      {screen === "ending" && <EndingScreen />}
    </div>
  );
}
