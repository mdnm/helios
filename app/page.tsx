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
import { compressIfNeeded, MAX_IMAGE_BYTES } from "./compress";
import { Icon } from "./icons";
import { log, warn } from "./log";

const HERO_SIZE = 168;
const CORNER_SIZE = 40;

type Phase = "hero" | "moving" | "chat";

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

type SuggestRepliesOutput = { options: string[] };

export default function Chat() {
  const { messages, sendMessage, status, setMessages } = useChat();
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [prepareLabel, setPrepareLabel] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("hero");
  const [dragDepth, setDragDepth] = useState(0);
  // Track which messages' chips have already been used so we hide them after click.
  const [usedChipMessageIds, setUsedChipMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInnerRef = useRef<HTMLDivElement>(null);
  // Mutable so updating it from the scroll handler doesn't trigger a re-render.
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDragging = dragDepth > 0;

  const isBusy = status === "submitted" || status === "streaming";

  // Log status / message-count transitions
  useEffect(() => {
    log("chat.status", { status, messages: messages.length });
  }, [status, messages.length]);
  const sunState: "idle" | "loading" = isBusy ? "loading" : "idle";
  const inChat = phase !== "hero" || messages.length > 0;
  const composerSlid = phase === "moving" || phase === "chat";
  const canEnd = phase === "chat" && messages.length > 0 && !isBusy;

  const getHeroPos = useCallback(() => {
    const el = composerRef.current;
    const h = el?.offsetHeight ?? 120;
    // Composer in hero mode is vertically centered.
    const composerTop = window.innerHeight / 2 - h / 2;
    return {
      top: composerTop - HERO_SIZE - 56,
      left: window.innerWidth / 2 - HERO_SIZE / 2,
      size: HERO_SIZE,
    };
  }, []);

  const getCornerPos = useCallback((targetPhase: Phase = phase) => {
    const composer = composerRef.current?.getBoundingClientRect();
    if (!composer) return { top: 60, left: 60, size: CORNER_SIZE };
    // In chat mode the composer is bottom-anchored regardless of its current visual position.
    let composerTop = composer.top;
    let composerLeft = composer.left;
    if (targetPhase !== "hero") {
      const h = composerRef.current?.offsetHeight ?? composer.height;
      const w = composerRef.current?.offsetWidth ?? composer.width;
      composerTop = window.innerHeight - h - 24;
      composerLeft = (window.innerWidth - w) / 2;
    }
    return {
      top: composerTop - CORNER_SIZE / 2 - 2,
      left: composerLeft - CORNER_SIZE / 2 + 6,
      size: CORNER_SIZE,
    };
  }, [phase]);

  const placeSunAt = useCallback(
    (mode: "hero" | "corner") => {
      const sun = sunRef.current;
      if (!sun) return;
      // Anchor the sun at the chat-phase corner so the arc endpoint is stable.
      // Hero visual position is achieved purely through transform.
      const corner = getCornerPos("chat");
      sun.style.top = corner.top + "px";
      sun.style.left = corner.left + "px";
      sun.style.width = CORNER_SIZE + "px";
      sun.style.height = CORNER_SIZE + "px";
      if (mode === "hero") {
        const hero = getHeroPos();
        const scale = HERO_SIZE / CORNER_SIZE;
        const dx = hero.left - corner.left;
        const dy = hero.top - corner.top;
        sun.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      } else {
        sun.style.transform = "translate(0, 0) scale(1)";
      }
    },
    [getHeroPos, getCornerPos],
  );

  useLayoutEffect(() => {
    placeSunAt(phase === "hero" ? "hero" : "corner");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => placeSunAt(phase === "hero" ? "hero" : "corner");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, placeSunAt]);

  useLayoutEffect(() => {
    if (phase !== "hero" && phase !== "moving") placeSunAt("corner");
  }, [messages.length, phase, placeSunAt]);

  // Keep --composer-height in sync with the composer's actual height, and
  // re-place the sun when it changes so the corner stays glued to the composer.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const screen = el.closest(".app-screen") as HTMLElement | null;
    const update = () => {
      const h = el.offsetHeight;
      if (screen) screen.style.setProperty("--composer-height", `${h}px`);
      placeSunAt(phase === "hero" ? "hero" : "corner");
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase, placeSunAt]);

  // Track whether the user is "stuck" to the bottom of the chat. We only
  // auto-scroll while they are — if they scroll up to read earlier messages,
  // we stop yanking them down. A user-initiated scroll close to the bottom
  // (within 80px) re-engages stickiness.
  //
  // Stored in a ref (not state) so updates from the scroll handler don't
  // trigger React re-renders.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onScroll = () => {
      const distance =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      stickToBottomRef.current = distance < 80;
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  // Drive auto-scroll directly off React's render cycle. The AI SDK gives us
  // a fresh `messages` array reference on every streamed token batch (and on
  // every part update), so this useLayoutEffect re-runs in lockstep with
  // streaming — far more reliable than a ResizeObserver, which can miss
  // small or coalesced reflows. Using useLayoutEffect means the scroll lands
  // before the browser paints, so the user never sees an unscrolled frame.
  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [messages, isBusy]);

  // ResizeObserver as a belt-and-suspenders fallback for layout changes that
  // aren't tied to a render — images loading, fonts swapping in, the composer
  // resizing as the textarea grows.
  useEffect(() => {
    const inner = chatInnerRef.current;
    const scroller = scrollRef.current;
    if (!inner || !scroller) return;
    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) scroller.scrollTop = scroller.scrollHeight;
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  // When a user message is sent, force-stick to bottom even if they had
  // scrolled up — sending implies re-engagement with the live conversation.
  useEffect(() => {
    if (!messages.length) return;
    if (messages[messages.length - 1].role === "user") {
      stickToBottomRef.current = true;
    }
    // Deliberately keyed on length only; the layout effect above already
    // handles streamed-token updates of the same message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Autosize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(180, Math.max(28, ta.scrollHeight)) + "px";
  }, [input]);

  const arcAnimate = useCallback(async () => {
    const sun = sunRef.current;
    if (!sun) return;
    const hero = getHeroPos();
    const corner = getCornerPos("chat");
    const scaleAtHero = HERO_SIZE / CORNER_SIZE;
    const dx = hero.left - corner.left;
    const dy = hero.top - corner.top;
    const apexExtraRise = 90;
    const apexDx = dx * 0.55;
    const apexDy = dy * 0.5 - apexExtraRise;
    const apexScale = (scaleAtHero + 1) / 2 + 0.3;
    const startT = `translate(${dx}px, ${dy}px) scale(${scaleAtHero})`;
    const midT = `translate(${apexDx}px, ${apexDy}px) scale(${apexScale})`;
    const endT = `translate(0px, 0px) scale(1)`;
    const anim = sun.animate(
      [
        { transform: startT, offset: 0 },
        { transform: midT, offset: 0.55 },
        { transform: endT, offset: 1 },
      ],
      {
        duration: 1100,
        easing: "cubic-bezier(0.45, 0, 0.3, 1)",
        fill: "forwards",
      },
    );
    try {
      await anim.finished;
    } catch {
      /* cancelled */
    }
    sun.style.transform = endT;
    anim.cancel();
  }, [getHeroPos, getCornerPos]);

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

  // Auto-dismiss the attach error after a few seconds.
  useEffect(() => {
    if (!attachError) return;
    const id = setTimeout(() => setAttachError(null), 5000);
    return () => clearTimeout(id);
  }, [attachError]);

  // Build/release object URL for the preview thumbnail.
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

  // Paste handler — accepts clipboard images from screenshots, copied
  // image files, etc. Attached to window so paste works regardless of
  // which element has focus (text-only paste still falls through to
  // the default textarea behaviour).
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
    async (override?: string) => {
      const text = (override ?? input).trim();
      if (!text && !files) {
        log("send.skipped.empty");
        return;
      }
      if (isBusy || phase === "moving") {
        log("send.skipped.busy", { isBusy, phase });
        return;
      }

      const isFirst = phase === "hero";
      log("send.start", {
        textLen: text.length,
        hasFiles: !!files,
        isFirst,
      });
      if (isFirst) {
        setPhase("moving");
        log("phase.moving");
        const t0 = performance.now();
        await arcAnimate();
        log("arc.done", { ms: Math.round(performance.now() - t0) });
      }
      setPhase("chat");
      log("phase.chat");

      sendMessage({ text, files });
      log("send.dispatched");
      setInput("");
      clearAttachment();
    },
    [input, files, isBusy, phase, arcAnimate, sendMessage, clearAttachment],
  );

  const resetChat = useCallback(() => {
    log("chat.reset");
    setMessages([]);
    setInput("");
    clearAttachment();
    setPhase("hero");
    log("phase.hero");
    requestAnimationFrame(() => placeSunAt("hero"));
  }, [setMessages, placeSunAt, clearAttachment]);

  const handleChipClick = (messageId: string, option: string) => {
    if (isBusy || phase === "moving") return;
    setUsedChipMessageIds((prev) => {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
    void handleSend(option);
  };

  // Pull the latest suggest_replies output from an assistant message, if any.
  const getChipsForMessage = (message: (typeof messages)[number]) => {
    if (message.role !== "assistant") return null;
    if (usedChipMessageIds.has(message.id)) return null;
    for (let i = message.parts.length - 1; i >= 0; i--) {
      const part = message.parts[i];
      if (
        part.type === "tool-suggestReplies" &&
        "state" in part &&
        part.state === "output-available"
      ) {
        const output = part.output as SuggestRepliesOutput | undefined;
        if (output?.options?.length) return output.options;
      }
    }
    return null;
  };

  // Only show chips on the most recent assistant message — older chips would
  // be stale conversational context.
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  return (
    <div
      className="stage"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className={`screen app-screen ${composerSlid ? "in-chat" : ""}`}>
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
          <span className="pill">
            <span className="dot" /> Balkonkraftwerk advisor
          </span>
        </header>

        <div ref={sunRef} className={`helios-sun-wrap ${phase !== "hero" ? "compact" : ""}`}>
          <HeliosSun state={sunState} />
        </div>

        <div className="chat-region" ref={scrollRef}>
          <div className="chat-inner" ref={chatInnerRef}>
            {messages.map((message) => {
              const chips =
                message.id === lastAssistantId
                  ? getChipsForMessage(message)
                  : null;
              return (
                <div
                  key={message.id}
                  className={`msg ${message.role === "user" ? "user" : "ai"}`}
                >
                  <div className="body">
                    {message.role === "assistant" && (
                      <div className="who">Helios</div>
                    )}
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        return message.role === "assistant" ? (
                          <ReactMarkdown key={`${message.id}-${i}`}>
                            {part.text}
                          </ReactMarkdown>
                        ) : (
                          <p
                            key={`${message.id}-${i}`}
                            style={{ whiteSpace: "pre-wrap" }}
                          >
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
                    {chips && (
                      <div className="chips">
                        {chips.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className="chip"
                            onClick={() => handleChipClick(message.id, option)}
                            disabled={isBusy || phase === "moving"}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isBusy &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "user" && (
                <div className="msg ai">
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

        <div ref={composerRef} className="composer-region">
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
                disabled={isBusy || phase === "moving"}
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
                    phase === "moving" ||
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
          <button className="end-btn" onClick={resetChat}>
            End conversation <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
