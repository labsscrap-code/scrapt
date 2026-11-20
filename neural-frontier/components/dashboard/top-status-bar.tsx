"use client";

import { Circle, Radio, Zap } from "lucide-react";
import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { Badge } from "@/components/ui/badge";
import { cn, formatClock } from "@/lib/utils";

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col leading-none">
      <span className="text-[8px] uppercase tracking-[0.18em] text-faint">
        {label}
      </span>
      <span
        className={cn(
          "mt-0.5 font-mono text-[11px] tabular-nums",
          accent ? "text-accent" : "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function TopStatusBar() {
  const { state, setAccent } = useBotSimulation();

  return (
    <header className="flex h-11 shrink-0 items-center gap-4 border-b border-edge bg-surface/70 px-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-accent/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        <span className="text-[12px] font-semibold tracking-tight text-ink">
          eth-orchestrator
        </span>
        <span className="text-[10px] text-faint">//</span>
        <Badge variant="accent">live</Badge>
      </div>

      <div className="h-5 w-px bg-edge" />

      <div className="flex items-center gap-5">
        <Stat label="nodes" value={String(state.nodes).padStart(2, "0")} />
        <Stat label="events / s" value={String(state.eventsPerSecond)} accent />
        <Stat label="active workers" value={String(state.activeWorkers)} />
        <Stat label="latency" value={`${state.latencyMs.toFixed(0)}ms`} />
        <Stat label="ticks" value={state.ticksProcessed.toLocaleString("en-US")} />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-faint">
          <Circle className="h-2 w-2 fill-success text-success" />
          client
          <span className="text-faint/60">/</span>
          <Radio className="h-2.5 w-2.5 text-accent" />
          bot-engine
        </div>

        <div className="flex items-center gap-1 rounded-md border border-edge bg-surface-2/70 p-0.5">
          {(["blue", "amber"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAccent(a)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[8px] uppercase tracking-wider transition-colors",
                state.accent === a
                  ? "bg-accent/15 text-accent"
                  : "text-faint hover:text-dim",
              )}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-dim">
          <Zap className="h-3 w-3 text-accent/70" />
          {formatClock(state.elapsedMs)}
        </div>
      </div>
    </header>
  );
}
