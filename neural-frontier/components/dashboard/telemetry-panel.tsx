"use client";

import { Gauge, Target, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { MODULES } from "@/lib/data";
import { cn, formatUsd } from "@/lib/utils";

export default function TelemetryPanel() {
  const { state } = useBotSimulation();
  const working = MODULES.find((m) => m.id === state.activeModuleId);
  const positive = state.pnl >= 0;

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-edge/70 px-2.5 py-1.5">
        <Gauge className="h-3 w-3 text-accent" />
        <CardTitle>output / telemetry</CardTitle>
        <span className="ml-auto rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-success">
          settled
        </span>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-2">
        <div>
          <div className="text-[8px] uppercase tracking-[0.18em] text-faint">
            session pnl
          </div>
          <div
            className={cn(
              "font-mono text-[34px] font-semibold leading-none tracking-tight tabular-nums",
              positive ? "text-success" : "text-danger",
            )}
          >
            {positive ? "+" : "-"}${formatUsd(Math.abs(state.pnl))}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-dim">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5 text-success" /> win{" "}
              {(state.winRate * 100).toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-2.5 w-2.5 text-accent" /> sharpe{" "}
              {state.sharpe.toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-2.5 w-2.5 text-warning" /> 53x faster
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[8px] uppercase tracking-wider text-faint">
            <span>pipeline</span>
            <span className="tabular-nums text-dim">
              {state.globalProgress.toFixed(0)}%
            </span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-[width] duration-300"
              style={{ width: `${state.globalProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 rounded-md border border-edge/70 bg-surface-2/40 p-2">
          {[
            { k: "equity", v: `$${formatUsd(state.equity, 0)}` },
            { k: "exposure", v: `${state.positionEth.toFixed(2)} ETH` },
            { k: "fees", v: `$${state.fees.toFixed(2)}` },
            { k: "signals", v: String(state.signalsFired) },
            { k: "orders", v: String(state.ordersFilled) },
            { k: "ticks", v: state.ticksProcessed.toLocaleString("en-US") },
          ].map((s) => (
            <div key={s.k}>
              <div className="text-[7px] uppercase tracking-wider text-faint">
                {s.k}
              </div>
              <div className="mt-0.5 font-mono text-[10px] tabular-nums text-ink">
                {s.v}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 rounded-md border border-accent/25 bg-accent/[0.07] px-2 py-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-accent/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="text-[8px] uppercase tracking-wider text-faint">
            working:
          </span>
          <span className="truncate text-[9px] text-accent">
            {working ? working.label.toLowerCase() : "—"}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[9px] tabular-nums text-dim">
            {state.eventsPerSecond} ev/s
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
