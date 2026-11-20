"use client";

import {
  Activity,
  Crosshair,
  Gauge,
  Layers,
  MoreHorizontal,
  Pause,
  Radar,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { cn } from "@/lib/utils";
import type { ModuleDef } from "@/lib/data";
import { ModuleViz } from "./module-viz";

const ICONS: Record<string, LucideIcon> = {
  Radio,
  Layers,
  Activity,
  Radar,
  ShieldCheck,
  SlidersHorizontal,
  Waypoints,
  Send,
  Gauge,
};

export default function ModuleCard({
  def,
  index,
  focused,
}: {
  def: ModuleDef;
  index: number;
  focused: boolean;
}) {
  const { state, pinModule, setHovered } = useBotSimulation();
  const mod = state.modules[index];
  const Icon = ICONS[def.icon] ?? Activity;
  const status = mod?.status ?? "queued";
  const pinned = state.pinnedModuleId === def.id;

  return (
    <div
      data-anchor={`R${index}`}
      role="button"
      tabIndex={0}
      onClick={() => pinModule(def.id)}
      onMouseEnter={() => setHovered(def.id)}
      onMouseLeave={() => setHovered(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pinModule(def.id);
        }
      }}
      className={cn(
        "group relative flex min-h-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-surface/85 p-2 backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        focused
          ? "border-accent/60 shadow-glow ring-2 ring-accent/70"
          : "border-edge hover:border-edge/80",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
            focused
              ? "border-accent/40 bg-accent/15 text-accent"
              : "border-edge bg-surface-2 text-dim",
          )}
        >
          <Icon className="h-2.5 w-2.5" />
        </span>
        <span className="truncate text-[10px] font-medium text-ink">
          {def.label}
        </span>
        <Badge
          variant={
            status === "running"
              ? "accent"
              : status === "done"
                ? "success"
                : "muted"
          }
          className="ml-auto shrink-0 text-[7px] tracking-[0.14em]"
        >
          {status}
        </Badge>
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${def.label} menu`}
                className="rounded p-0.5 text-faint transition-colors hover:bg-white/5 hover:text-dim"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => pinModule(def.id)}>
                <Crosshair className="h-3 w-3" /> focus module
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => pinModule(null)}>
                <RotateCcw className="h-3 w-3" /> clear pin
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Pause className="h-3 w-3" /> pause worker
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      <div className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            status === "done" ? "bg-success" : "bg-accent",
          )}
          style={{ width: `${mod?.progress ?? 0}%` }}
        />
      </div>

      <div className="mt-1.5 flex flex-1 flex-col justify-between gap-[3px]">
        {(mod?.metrics ?? []).slice(0, 4).map((mt) => (
          <div
            key={mt.label}
            className="flex items-baseline justify-between gap-2 text-[9px] leading-none"
          >
            <span className="truncate text-faint">{mt.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-dim">
              {mt.value}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-1.5">
        <ModuleViz
          viz={def.viz}
          progress={mod?.progress ?? 0}
          tick={state.tick}
          focused={focused}
        />
      </div>

      {pinned ? (
        <span className="pointer-events-none absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-warning" />
      ) : null}
    </div>
  );
}
