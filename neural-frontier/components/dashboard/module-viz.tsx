"use client";

import { Check, FileCode2, Folder, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VizKind } from "@/lib/data";

const RULES = ["max_exposure", "drawdown_guard", "stale_book", "slip_cap"];
const VENUES = ["binance", "okx", "bybit", "kraken"];

export function ModuleViz({
  viz,
  progress,
  tick,
  focused,
}: {
  viz: VizKind;
  progress: number;
  tick: number;
  focused: boolean;
}) {
  const pct = Math.max(0, Math.min(100, progress));

  switch (viz) {
    case "files":
      return (
        <div className="space-y-[3px]">
          {[
            { Icon: Folder, name: "l2_stream" },
            { Icon: FileCode2, name: "eth_usdt.json" },
            { Icon: Terminal, name: "tape.log" },
          ].map((f, i) => {
            const bar = Math.max(6, Math.min(100, pct - i * 24));
            return (
              <div key={f.name} className="flex items-center gap-1">
                <f.Icon className="h-2 w-2 shrink-0 text-faint" />
                <span className="w-[74px] shrink-0 truncate text-[8px] text-dim">
                  {f.name}
                </span>
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-success/70 transition-[width] duration-300"
                    style={{ width: `${bar}%` }}
                  />
                </div>
                <span className="w-4 shrink-0 text-right text-[7px] tabular-nums text-faint">
                  {Math.round(bar)}
                </span>
              </div>
            );
          })}
        </div>
      );

    case "tree":
      return (
        <div className="space-y-[3px]">
          {[86, 60, 74, 44].map((w, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="w-2 shrink-0 text-[7px] leading-none text-faint">
                {i === 3 ? "└" : "├"}
              </span>
              <div
                className={cn(
                  "h-[3px] rounded-full transition-[width] duration-300",
                  i === 1 ? "bg-accent/60" : "bg-white/[0.09]",
                )}
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
          <div className="pt-0.5 text-[7px] tabular-nums text-faint">
            depth {Math.round(pct)}%
          </div>
        </div>
      );

    case "grid-check":
      return (
        <div className="grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }).map((_, i) => {
            const on = pct > (i / 9) * 100 + 8;
            return (
              <div
                key={i}
                className={cn(
                  "h-3 rounded-[2px] border transition-colors duration-200",
                  on
                    ? "border-accent/50 bg-accent/25"
                    : "border-edge bg-white/[0.02]",
                )}
              />
            );
          })}
        </div>
      );

    case "skeleton":
      return (
        <div className="space-y-1">
          <div className="h-4 rounded-[2px] border border-edge bg-white/[0.02]" />
          <div className="flex gap-1">
            <div className="h-1.5 w-2/3 rounded-[2px] bg-white/[0.07]" />
            <div className="h-1.5 w-1/3 rounded-[2px] bg-accent/30" />
          </div>
          <div className="h-1.5 w-1/2 rounded-[2px] bg-white/[0.04]" />
        </div>
      );

    case "equalizer":
      return (
        <div className="flex h-8 items-end gap-[2px]">
          {Array.from({ length: 14 }).map((_, i) => {
            const v =
              20 + Math.abs(Math.sin(tick / 4 + i * 0.7)) * (55 + (i % 3) * 12);
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-[1px] transition-[height] duration-150",
                  focused ? "bg-accent/70" : "bg-accent/45",
                )}
                style={{ height: `${Math.min(100, v)}%` }}
              />
            );
          })}
        </div>
      );

    case "rules":
      return (
        <div className="space-y-[3px]">
          {RULES.map((r, i) => {
            const on = pct > (i + 1) * 18;
            return (
              <div key={r} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1 w-1 shrink-0 rounded-full",
                    on ? "bg-success" : "bg-faint/50",
                  )}
                />
                <span className="flex-1 truncate text-[8px] text-dim">{r}</span>
                <span
                  className={cn(
                    "h-1.5 w-3 shrink-0 rounded-full transition-colors",
                    on ? "bg-success/70" : "bg-white/10",
                  )}
                />
              </div>
            );
          })}
        </div>
      );

    case "checks":
      return (
        <div className="grid grid-cols-4 gap-[3px]">
          {Array.from({ length: 8 }).map((_, i) => {
            const on = pct > (i / 8) * 100;
            return (
              <div
                key={i}
                className={cn(
                  "flex h-4 items-center justify-center rounded-[2px] border transition-colors duration-200",
                  on
                    ? "border-success/40 bg-success/10"
                    : "border-edge bg-white/[0.02]",
                )}
              >
                <Check
                  className={cn("h-2 w-2", on ? "text-success" : "text-faint/30")}
                />
              </div>
            );
          })}
        </div>
      );

    case "bars":
      return (
        <div className="space-y-[4px]">
          {VENUES.map((v, i) => {
            const w = Math.max(
              4,
              Math.min(100, pct - i * 14 + Math.sin(tick / 5 + i) * 8),
            );
            return (
              <div key={v} className="flex items-center gap-1.5">
                <span className="w-8 shrink-0 text-[7px] text-faint">{v}</span>
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-accent/60 transition-[width] duration-300"
                    style={{ width: `${w}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );

    case "output":
      return (
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-[15px] font-semibold leading-none tabular-nums text-success">
              +${(pct * 3.4).toFixed(2)}
            </div>
            <div className="mt-0.5 text-[7px] uppercase tracking-wider text-faint">
              settled pnl
            </div>
          </div>
          <div className="flex h-7 flex-1 items-end gap-[2px]">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-[1px] bg-success/50 transition-[height] duration-150"
                style={{
                  height: `${20 + Math.abs(Math.sin(tick / 5 + i)) * 70}%`,
                }}
              />
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
