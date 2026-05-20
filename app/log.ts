// Lightweight client-side logger with a [helios +Xs] prefix.
const start = typeof performance !== "undefined" ? performance.now() : Date.now();

function elapsed(): string {
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  return `+${((now - start) / 1000).toFixed(2)}s`;
}

export function log(event: string, data?: unknown): void {
  if (typeof window === "undefined") return;
  if (data === undefined) {
    console.log(`[helios ${elapsed()}] ${event}`);
  } else {
    console.log(`[helios ${elapsed()}] ${event}`, data);
  }
}

export function warn(event: string, data?: unknown): void {
  if (typeof window === "undefined") return;
  if (data === undefined) {
    console.warn(`[helios ${elapsed()}] ${event}`);
  } else {
    console.warn(`[helios ${elapsed()}] ${event}`, data);
  }
}
