"use client";

type HeliosSunProps = {
  state?: "idle" | "fade-in" | "loading" | "fade-out";
};

export function HeliosSun({ state = "idle" }: HeliosSunProps) {
  return (
    <svg viewBox="0 0 512 512" className={`helios-sun ${state}`} role="img" aria-label="Helios sun">
      <defs>
        <linearGradient id="hsunGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="100%" stopColor="#FF8C1A" />
        </linearGradient>
        <clipPath id="hsunClip" clipPathUnits="userSpaceOnUse">
          <path
            d="M 0 0 H 512 V 512 H 0 Z M 256 156 A 100 100 0 1 0 256 356 A 100 100 0 1 0 256 156 Z"
            clipRule="evenodd"
          />
        </clipPath>
        <g id="hsunRay" transform="translate(195.46 95.15) scale(2.5)">
          <path
            d="M24.4555 48.6526C15.5899 49.2669 6.82175 44.3527 2.43766 35.3432C-2.82325 24.2861 0.684025 10.5671 10.5239 3.80998C14.7131 1.0457 19.3895 -0.182859 23.9684 0.0219016C25.5272 0.124282 26.0143 2.27427 24.6504 3.09332C13.544 9.74805 9.74448 24.6956 16.1745 36.367C18.4152 40.4622 21.5328 43.5336 25.1375 45.5812C26.5015 46.4003 26.0143 48.5503 24.4555 48.6526Z"
            fill="url(#hsunGrad)"
          />
        </g>
      </defs>

      <g className="rays" clipPath="url(#hsunClip)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <use key={a} href="#hsunRay" transform={`rotate(${a} 256 256)`} />
        ))}
      </g>

      <circle className="disc" cx="256" cy="256" r="95" fill="url(#hsunGrad)" />

      <circle
        className="ring"
        cx="256"
        cy="256"
        r="160"
        fill="none"
        stroke="#FF8C1A"
        strokeOpacity="0.55"
        strokeWidth="8"
        transform="rotate(-90 256 256)"
      />

      <g className="orbiter">
        <circle cx="256" cy="96" r="16" fill="url(#hsunGrad)" />
      </g>
    </svg>
  );
}
