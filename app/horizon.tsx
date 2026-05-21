"use client";

type Kind =
  | "dots"
  | "plus"
  | "diamond"
  | "bracket-curly"
  | "tag"
  | "circuit"
  | "wave";

type Item = { x: number; y: number; kind: Kind; w: number; opacity: number };

const HORIZON_ITEMS: Item[] = [
  { x: 8, y: 14, kind: "dots", w: 36, opacity: 0.4 },
  { x: 22, y: 22, kind: "plus", w: 14, opacity: 0.35 },
  { x: 78, y: 14, kind: "dots", w: 32, opacity: 0.35 },
  { x: 88, y: 24, kind: "tag", w: 22, opacity: 0.3 },
  { x: 6, y: 58, kind: "circuit", w: 120, opacity: 0.45 },
  { x: 28, y: 62, kind: "dots", w: 42, opacity: 0.5 },
  { x: 44, y: 70, kind: "diamond", w: 12, opacity: 0.55 },
  { x: 56, y: 60, kind: "bracket-curly", w: 22, opacity: 0.45 },
  { x: 70, y: 68, kind: "wave", w: 60, opacity: 0.45 },
  { x: 86, y: 62, kind: "dots", w: 36, opacity: 0.45 },
  { x: 16, y: 86, kind: "plus", w: 10, opacity: 0.4 },
  { x: 50, y: 88, kind: "diamond", w: 10, opacity: 0.35 },
  { x: 84, y: 86, kind: "plus", w: 10, opacity: 0.4 },
];

function HorizonMotif({ kind }: { kind: Kind }) {
  switch (kind) {
    case "dots": {
      const dots = [];
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 6; c++)
          dots.push(<circle key={`${r}-${c}`} cx={4 + c * 8} cy={4 + r * 8} r={1.2} />);
      return (
        <svg viewBox="0 0 48 32" fill="currentColor">
          {dots}
        </svg>
      );
    }
    case "plus":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 4 V20 M4 12 H20" />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3 L21 12 L12 21 L3 12 Z" />
        </svg>
      );
    case "bracket-curly":
      return (
        <svg viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3 C8 3 10 12 4 12 C10 12 8 21 14 21" />
          <path d="M34 3 C40 3 38 12 44 12 C38 12 40 21 34 21" />
        </svg>
      );
    case "tag":
      return (
        <svg viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6 L9 12 L4 18" />
          <path d="M44 6 L39 12 L44 18" />
          <path d="M16 20 L32 4" />
        </svg>
      );
    case "circuit":
      return (
        <svg viewBox="0 0 120 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M0 12 H22 L30 4 H56 L64 12 H88 L96 20 H120" />
          <circle cx="22" cy="12" r="2.5" fill="currentColor" />
          <circle cx="56" cy="4" r="2.5" fill="currentColor" />
          <circle cx="88" cy="12" r="2.5" fill="currentColor" />
          <circle cx="96" cy="20" r="2.5" fill="currentColor" />
        </svg>
      );
    case "wave":
      return (
        <svg viewBox="0 0 80 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M2 10 Q12 2, 22 10 T42 10 T62 10 T82 10" />
        </svg>
      );
  }
}

export function Horizon() {
  return (
    <div className="horizon" aria-hidden="true">
      {HORIZON_ITEMS.map((it, i) => (
        <div
          key={i}
          className="horizon-item"
          style={
            {
              left: `${it.x}%`,
              top: `${it.y}%`,
              width: `${it.w}px`,
              opacity: it.opacity,
              "--delay": `${(i % 7) * 0.12}s`,
            } as React.CSSProperties
          }
        >
          <HorizonMotif kind={it.kind} />
        </div>
      ))}
    </div>
  );
}
