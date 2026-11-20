"use client";

import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { cn, formatUsd } from "@/lib/utils";

const TONES = {
  accent: "bg-accent/70",
  mid: "bg-accent-mid/70",
  success: "bg-success/70",
  warning: "bg-warning/70",
} as const;

function Bars({
  series,
  tone = "accent",
}: {
  series: number[];
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="flex h-9 w-full items-end gap-[1px]">
      {series.slice(-40).map((v, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-[1px] transition-[height] duration-200 ease-out",
            TONES[tone],
          )}
          style={{ height: `${Math.max(4, Math.min(100, v))}%` }}
        />
      ))}
    </div>
  );
}

function MetricCard({
  index,
  label,
  value,
  sub,
  series,
  tone = "accent",
  dot,
}: {
  index: number;
  label: string;
  value: string;
  sub: string;
  series: number[];
  tone?: keyof typeof TONES;
  dot?: "accent" | "success" | "warning";
}) {
  return (
    <div
      data-anchor={`L${index}`}
      className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 overflow-hidden rounded-lg border border-edge bg-surface/80 px-2.5 py-2 backdrop-blur-sm transition-colors hover:border-accent/30"
    >
      <div className="flex items-center justify-between">
        <span className="text-[8px] uppercase tracking-[0.16em] text-faint">
          {label}
        </span>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dot === "success" && "bg-success",
            dot === "warning" && "bg-warning",
            (!dot || dot === "accent") && "bg-accent/80",
          )}
        />
      </div>

      <div className="min-w-0">
        <div className="truncate font-mono text-[18px] font-semibold leading-none tracking-tight tabular-nums text-ink">
          {value}
        </div>
        <div className="mt-1 truncate text-[9px] text-dim">{sub}</div>
      </div>

      <Bars series={series} tone={tone} />
    </div>
  );
}

export default function MetricsPanel() {
  const { state } = useBotSimulation();
  const change = ((state.ethPrice - state.priceOpen) / state.priceOpen) * 100;
  const [priceSeries, equitySeries, exposureSeries, latencySeries] = state.spark;

  return (
    <aside className="flex h-full min-h-0 w-[224px] shrink-0 flex-col gap-2">
      <MetricCard
        index={0}
        label="eth / usdt"
        value={`$${formatUsd(state.ethPrice)}`}
        sub={`${change >= 0 ? "+" : ""}${change.toFixed(2)}% 24h · 7y history`}
        series={priceSeries}
      />
      <MetricCard
        index={1}
        label="session pnl"
        value={`${state.pnl >= 0 ? "+" : "-"}$${formatUsd(Math.abs(state.pnl))}`}
        sub={`equity $${formatUsd(state.equity, 0)} · win ${(state.winRate * 100).toFixed(0)}%`}
        series={equitySeries}
        tone="success"
        dot="success"
      />
      <MetricCard
        index={2}
        label="exposure"
        value={`${state.positionEth.toFixed(2)} ETH`}
        sub={`$${formatUsd(state.notional, 0)} notional · long`}
        series={exposureSeries}
      />
      <MetricCard
        index={3}
        label="system"
        value={`${state.latencyMs.toFixed(0)}ms`}
        sub={`mem ${state.memPct}% · gpu ${state.gpuPct}% · err ${state.errors}`}
        series={latencySeries}
        tone="mid"
        dot="success"
      />
    </aside>
  );
}
