"use client";

import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { MODULES } from "@/lib/data";
import { cn } from "@/lib/utils";
import ModuleCard from "./module-card";

export default function ModuleGrid() {
  const { state, focusedModuleId } = useBotSimulation();
  const pinned = Boolean(state.pinnedModuleId);

  return (
    <section className="flex w-[720px] shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.18em] text-faint">
            workers / modules
          </span>
          <span className="rounded border border-edge bg-surface-2 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-dim">
            3 × 3
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] text-faint">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              pinned ? "bg-warning" : "animate-pulse bg-accent",
            )}
          />
          {pinned ? `pinned · ${state.pinnedModuleId}` : `auto · ${state.working}`}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-2">
        {MODULES.map((m, i) => (
          <ModuleCard
            key={m.id}
            def={m}
            index={i}
            focused={focusedModuleId === m.id}
          />
        ))}
      </div>
    </section>
  );
}
