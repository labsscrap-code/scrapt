"use client";

import { Gauge, Pause, Play, RotateCcw } from "lucide-react";
import { Tip } from "@/components/ui/tooltip";
import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { cn } from "@/lib/utils";

export default function CliBar() {
  const { state, togglePause, setSpeed, reset } = useBotSimulation();

  return (
    <footer className="flex h-10 shrink-0 items-center gap-3 border-t border-edge bg-surface/70 px-3 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[11px]">
        <span className="text-success">~/eth-bot</span>
        <span className="text-faint">$</span>
        <span className="truncate text-dim">
          run strategy --pair ETHUSDT --tf 5m --size dynamic --live
        </span>
        {!state.paused ? (
          <span className="cursor-blink inline-block h-3 w-[6px] shrink-0 bg-accent" />
        ) : (
          <span className="text-[9px] uppercase tracking-wider text-warning">
            paused
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {[1, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s as 1 | 5)}
            className={cn(
              "rounded border px-2 py-0.5 text-[9px] uppercase tracking-wider transition-colors",
              state.speed === s
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-edge text-faint hover:text-dim",
            )}
          >
            {s}x
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-edge" />

        <Tip label={state.paused ? "resume stream" : "pause stream"}>
          <button
            type="button"
            onClick={togglePause}
            className="flex h-6 items-center gap-1 rounded border border-edge bg-surface-2/60 px-2 text-[9px] uppercase tracking-wider text-dim transition-colors hover:text-ink"
          >
            {state.paused ? (
              <Play className="h-2.5 w-2.5" />
            ) : (
              <Pause className="h-2.5 w-2.5" />
            )}
            {state.paused ? "play" : "pause"}
          </button>
        </Tip>

        <Tip label="reset simulation">
          <button
            type="button"
            onClick={reset}
            className="flex h-6 items-center gap-1 rounded border border-edge bg-surface-2/60 px-2 text-[9px] uppercase tracking-wider text-dim transition-colors hover:text-ink"
          >
            <RotateCcw className="h-2.5 w-2.5" /> reset
          </button>
        </Tip>

        <div className="ml-1 hidden items-center gap-1 text-[9px] uppercase tracking-wider text-faint sm:flex">
          <Gauge className="h-3 w-3" />
          {state.paused ? "halted" : "streaming"}
        </div>
      </div>
    </footer>
  );
}
