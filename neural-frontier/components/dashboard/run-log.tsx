"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { cn } from "@/lib/utils";

export default function RunLog() {
  const { state } = useBotSimulation();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.log.length]);

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-edge/70 px-2.5 py-1.5">
        <Terminal className="h-3 w-3 text-accent" />
        <CardTitle>run log</CardTitle>
        <span className="ml-auto text-[8px] uppercase tracking-wider text-faint">
          {state.log.length} events
        </span>
      </CardHeader>
      <CardContent
        ref={scrollerRef}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto p-0"
      >
        <div className="divide-y divide-white/[0.03]">
          {state.log.map((e, i) => {
            const last = i === state.log.length - 1;
            return (
              <div
                key={e.id}
                className={cn(
                  "flex items-start gap-2 px-2.5 py-[3px] text-[9px] leading-[1.5]",
                  last && "log-in bg-accent/[0.07]",
                )}
              >
                <span className="w-[56px] shrink-0 font-mono tabular-nums text-faint">
                  {e.t.slice(0, 8)}
                </span>
                <span
                  className={cn(
                    "w-[62px] shrink-0 truncate",
                    last ? "text-accent" : "text-accent/60",
                  )}
                >
                  {e.stage}
                </span>
                <span className="min-w-0 flex-1 truncate text-dim">{e.msg}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
