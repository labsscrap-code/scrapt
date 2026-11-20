import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

export function pad(n: number, size = 2) {
  return String(n).padStart(size, "0");
}

/** Wall-clock style timestamp built from elapsed simulation time, starting at 08:00:00.000 */
export function formatClock(ms: number) {
  const t = 8 * 3600 * 1000 + ms;
  const h = Math.floor(t / 3_600_000) % 24;
  const m = Math.floor(t / 60_000) % 60;
  const s = Math.floor(t / 1_000) % 60;
  const milli = Math.floor(t % 1_000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(milli, 3)}`;
}

export function formatUsd(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function signed(n: number, digits = 2) {
  return `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(digits)}`;
}
