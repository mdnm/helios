import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Icon = {
  Send: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} strokeWidth={2.2} {...p}>
      <path d="M5 12l14 -7l-5 14l-3 -6l-6 -1z" />
    </svg>
  ),
  Mic: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  ),
  Attach: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M21 12.5l-9.5 9.5a5.5 5.5 0 0 1 -7.8 -7.8l9.5 -9.5a3.7 3.7 0 0 1 5.2 5.2l-9.5 9.5a1.9 1.9 0 0 1 -2.6 -2.6l8.6 -8.6" />
    </svg>
  ),
  Bolt: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Sun: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41 -1.41M17.66 6.34l1.41 -1.41" />
    </svg>
  ),
  Leaf: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M11 20a7 7 0 0 1 7 -7c4 0 4 -7 4 -7s-7 0 -10 3a7 7 0 0 0 -1 9" />
      <path d="M2 22c0 -8 5 -16 13 -16" />
    </svg>
  ),
  Home: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M3 11l9 -8l9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1 -1v-10" />
    </svg>
  ),
  Euro: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M21 5a9 9 0 1 0 0 14" />
      <path d="M3 10h11" />
      <path d="M3 14h11" />
    </svg>
  ),
  Mail: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6l9 -6" />
    </svg>
  ),
  Arrow: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  ),
  X: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  ),
  Speaker: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M11 5L6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a4.5 4.5 0 0 1 0 7" />
      <path d="M18.5 5.5a8.5 8.5 0 0 1 0 13" />
    </svg>
  ),
  SpeakerOff: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M11 5L6 9H3v6h3l5 4z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  ),
};
