"use client";

import { ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { MODULES } from "@/lib/data";
import { cn, formatCompact } from "@/lib/utils";

export default function DispatchPanel() {
  const { state, focusedModuleId } = useBotSimulation();

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-edge/70 px-2.5 py-1.5">
        <ListChecks className="h-3 w-3 text-accent" />
        <CardTitle>dispatch</CardTitle>
        <span className="ml-auto text-[8px] uppercase tracking-wider text-faint">
          {state.activeWorkers} active
        </span>
      </CardHeader>
      <CardContent className="scroll-thin min-h-0 flex-1 space-y-[5px] overflow-y-auto px-2.5 py-2">
        {MODULES.map((m, i) => {
          const mod = state.modules[i];
          const hot = focusedModuleId === m.id;
          const pct = mod?.progress ?? 0;
          return (
            <div key={m.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "w-[70px] shrink-0 truncate text-[9px]",
                  hot ? "text-accent" : "text-dim",
                )}
              >
                {m.short}
              </span>
              <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    mod?.status === "done" ? "bg-success" : "bg-accent",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[8px] tabular-nums text-faint">
                {Math.round(pct)}%
              </span>
              <span className="w-[60px] shrink-0 text-right text-[8px] tabular-nums text-faint">
                {formatCompact(mod?.current ?? 0)}/{formatCompact(mod?.total ?? 0)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
