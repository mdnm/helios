"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { HeliosSun } from "./helios-sun";
import { OpeningScreen } from "./opening-screen";
import { EndingScreen } from "./ending-screen";
import { compressIfNeeded, MAX_IMAGE_BYTES } from "./compress";
import { Icon } from "./icons";
import { ProductCards } from "./product-cards";
import { log, warn } from "./log";
import { audio } from "./audio";
import { MuteToggle } from "./mute-toggle";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);
const SUN_BASE = 340;
const HERO_SIZE = 168;
const CORNER_SIZE = 40;
const TICKET_COOKIE = "helios-ticket-id";
const SCREEN_SEQUENCE = ["opening", "app", "ending"] as const;

type Screen = (typeof SCREEN_SEQUENCE)[number];
type Phase = "hero" | "chat";
type SunPhase = "idle" | "fade-in" | "loading" | "fade-out";
type TicketMessage = { role: string; content: string; parts?: Array<Record<string, unknown>>; timestamp?: string };

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

function getTicketId(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TICKET_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setTicketCookie(ticketId: string) {
  document.cookie = `${TICKET_COOKIE}=${encodeURIComponent(ticketId)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearTicketCookie() {
  document.cookie = `${TICKET_COOKIE}=; path=/; max-age=0`;
}

function hasStripeReturn(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("session_id");
}

function clearStripeReturnUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, "", window.location.pathname);
}

function PaymentConfirmation() {
  return (
    <div className="msg ai">
      <div className="body">
        <div className="who">Helios</div>
        <p>
          Payment completed! Your Balkonkraftwerk order is confirmed. You&apos;ll
          receive a confirmation email shortly.
        </p>
      </div>
    </div>
  );
}

const STRIPE_APPEARANCE = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "#F46B16",
    colorBackground: "#FFFFFF",
    colorText: "#1F1408",
    colorDanger: "#df1b41",
    fontFamily: "Onest, ui-sans-serif, system-ui, -apple-system, sans-serif",
    spacingUnit: "4px",
    borderRadius: "12px",
    colorTextSecondary: "#5A4523",
    colorTextPlaceholder: "#BBA98A",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(74, 47, 14, 0.14)",
      boxShadow: "none",
      padding: "12px",
    },
    ".Input:focus": {
      border: "1px solid rgba(244, 107, 22, 0.4)",
      boxShadow: "0 0 0 3px rgba(244, 107, 22, 0.1)",
    },
    ".Label": {
      fontSize: "13px",
      fontWeight: "500",
      color: "#5A4523",
    },
  },
};

function PaymentForm({ onPaymentComplete }: { onPaymentComplete: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setSubmitting(false);
    } else {
      onPaymentComplete();
    }
  }, [stripe, elements, onPaymentComplete]);

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-form-header">
        <Icon.Lock />
        <span>Secure payment</span>
      </div>
      <PaymentElement />
      {error && <div className="payment-error">{error}</div>}
      <button type="submit" disabled={!stripe || submitting} className="payment-submit">
        {submitting ? "Processing…" : "Pay now"}
      </button>
    </form>
  );
}

function StripeCheckout({
  clientSecret,
  onPaymentComplete,
}: {
  clientSecret: string;
  onPaymentComplete: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "paid" | "pending">("loading");

  useEffect(() => {
    stripePromise.then((stripe) => {
      if (!stripe) return;
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        if (paymentIntent?.status === "succeeded") {
          setStatus("paid");
          onPaymentComplete();
        } else {
          setStatus("pending");
        }
      });
    });
  }, [clientSecret, onPaymentComplete]);

  if (status === "loading") return null;

  if (status === "paid") {
    return (
      <div className="payment-confirmation">
        <Icon.Check /> Payment completed! Your Balkonkraftwerk order is confirmed.
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: STRIPE_APPEARANCE,
    fonts: [
      { cssSrc: "https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600&display=swap" },
    ],
  };

  return (
    <div className="stripe-payment">
      <Elements stripe={stripePromise} options={options}>
        <PaymentForm onPaymentComplete={() => { setStatus("paid"); onPaymentComplete(); }} />
      </Elements>
    </div>
  );
}

async function syncToEpilot(ticketId: string, messages: UIMessage[]) {
  try {
    await fetch("/api/chat-session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, messages }),
    });
  } catch {
    // best-effort
  }
}

function useTicketSession() {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnedFromStripe] = useState(hasStripeReturn);

  useEffect(() => {
    if (returnedFromStripe) clearStripeReturnUrl();
  }, [returnedFromStripe]);

  useEffect(() => {
    async function init() {
      const existing = getTicketId();
      if (existing) {
        try {
          const res = await fetch(`/api/chat-session?ticketId=${existing}`);
          if (res.ok) {
            const data = await res.json();
            setTicketId(data.ticketId);
            if (data.messages?.length) {
              setInitialMessages(
                data.messages.map((m: TicketMessage, i: number) => ({
                  id: `restored-${i}`,
                  role: m.role as "user" | "assistant",
                  parts: Array.isArray(m.parts) && m.parts.length > 0
                    ? m.parts.map((p) => {
                        if (typeof p.type === "string" && p.type.startsWith("tool-")) {
                          return { ...p, type: p.type } as unknown as { type: "text"; text: string };
                        }
                        return { type: "text" as const, text: String(p.text ?? "") };
                      })
                    : [{ type: "text" as const, text: m.content }],
                  createdAt: m.timestamp ? new Date(m.timestamp) : new Date(),
                })),
              );
            }
            setLoading(false);
            return;
          }
        } catch {
          // stale cookie
        }
      }

      try {
        const res = await fetch("/api/chat-session", { method: "POST" });
        const data = await res.json();
        setTicketId(data.ticketId);
        setTicketCookie(data.ticketId);
      } catch {
        // offline
      }
      setLoading(false);
    }

    init();
  }, []);

  const resetSession = useCallback(async () => {
    clearTicketCookie();
    try {
      const res = await fetch("/api/chat-session", { method: "POST" });
      const data = await res.json();
      setTicketId(data.ticketId);
      setTicketCookie(data.ticketId);
    } catch {
      setTicketId(null);
    }
  }, []);

  return { ticketId, initialMessages, loading, returnedFromStripe, resetSession };
}

export default function Chat() {
  const {
    ticketId,
    initialMessages,
    loading,
    returnedFromStripe,
    resetSession,
  } = useTicketSession();
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
  // Track which messages' chips have already been used so we hide them after click.
  const [usedChipMessageIds, setUsedChipMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [paymentCompleted, setPaymentCompleted] = useState(returnedFromStripe);
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
  const chatInnerRef = useRef<HTMLDivElement>(null);
  const restoredMessagesRef = useRef(false);
  const lastSyncedLength = useRef(0);
  // Mutable so updating it from the scroll handler doesn't trigger a re-render.
  const stickToBottomRef = useRef(true);
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

  useEffect(() => {
    if (loading || restoredMessagesRef.current || !initialMessages.length) {
      return;
    }
    restoredMessagesRef.current = true;
    setMessages(initialMessages);
    setPhase("chat");
    setScreen("app");
  }, [initialMessages, loading, setMessages]);

  useEffect(() => {
    if (
      status === "ready" &&
      messages.length > 0 &&
      messages.length !== lastSyncedLength.current &&
      ticketId
    ) {
      lastSyncedLength.current = messages.length;
      void syncToEpilot(ticketId, messages);
    }
  }, [messages, status, ticketId]);
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
      // Audio choreography lives here (not in onWake) so the same
      // transitions fire regardless of how they're triggered — click,
      // keyboard, end-conversation button, etc.
      if (screen === "opening" && next !== "opening") {
        audio.unlock();
        if (next === "app") audio.playBling();
        // 220 ms gets ambient out of the way by the chime's peak (~250 ms)
        // without feeling cut off.
        audio.fadeOutAmbient(220);
      }
      if (next === "app") {
        setMessages([]);
        setInput("");
        setPaymentCompleted(false);
        lastSyncedLength.current = 0;
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

  const handlePaymentComplete = useCallback(() => {
    setPaymentCompleted(true);
    if (ticketId && messages.length > 0) {
      const paymentMessage = {
        id: `payment-confirmed-${Date.now()}`,
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: "Payment completed! Your Balkonkraftwerk order is confirmed. You'll receive a confirmation email shortly.",
          },
        ],
      };
      void syncToEpilot(ticketId, [...messages, paymentMessage as UIMessage]);
    }
  }, [messages, ticketId]);

  const handleChipClick = (messageId: string, option: string) => {
    if (isBusy || phase !== "chat") return;
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

      {screen === "opening" && <OpeningScreen onWake={() => goto("app")} />}

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
            <button
              type="button"
              className="wordmark"
              onClick={() => {
                setMessages([]);
                setInput("");
                setPaymentCompleted(false);
                lastSyncedLength.current = 0;
                clearAttachment();
                setPhase("hero");
                void resetSession();
              }}
              aria-label="New conversation"
            >
              Helios
            </button>
            <MuteToggle variant="app" />
          </header>

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
                        if (part.type === "tool-getProducts") {
                          const toolPart = part as unknown as {
                            state: string;
                            output?: { products?: Array<{ id: string; name: string; modules: string; totalWp: number; inverter: string; battery: string | null; smartMeter: string | null; mounting: string; connection: string; price: number; selfConsumptionRate: number; bestFor: string }> };
                          };
                          if (
                            toolPart.state === "output-available" &&
                            toolPart.output?.products?.length
                          ) {
                            return (
                              <ProductCards
                                key={`${message.id}-${i}`}
                                products={toolPart.output.products}
                                selectedId={null}
                                onSelect={(id) => {
                                  const product = toolPart.output!.products!.find((p) => p.id === id);
                                  if (product) {
                                    handleChipClick(message.id, `I'd like the ${product.name} option`);
                                  }
                                }}
                              />
                            );
                          }
                        }
                        if (
                          part.type === "tool-submitOrder" &&
                          !paymentCompleted
                        ) {
                          const toolPart = part as unknown as {
                            state: string;
                            output?: { clientSecret?: string };
                          };
                          if (
                            toolPart.state === "output-available" &&
                            toolPart.output?.clientSecret
                          ) {
                            return (
                              <StripeCheckout
                                key={`${message.id}-${i}`}
                                clientSecret={toolPart.output.clientSecret}
                                onPaymentComplete={handlePaymentComplete}
                              />
                            );
                          }
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
                              disabled={isBusy || phase !== "chat"}
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
              {paymentCompleted && <PaymentConfirmation />}
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
