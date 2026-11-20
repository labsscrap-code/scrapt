"use client";

import { BotSimulationProvider } from "@/hooks/use-bot-simulation";
import { TooltipProvider } from "@/components/ui/tooltip";
import CliBar from "@/components/dashboard/cli-bar";
import DispatchPanel from "@/components/dashboard/dispatch-panel";
import MetricsPanel from "@/components/dashboard/metrics-panel";
import ModuleGrid from "@/components/dashboard/module-grid";
import RunLog from "@/components/dashboard/run-log";
import TelemetryPanel from "@/components/dashboard/telemetry-panel";
import ThreadGraph from "@/components/dashboard/thread-graph";
import TopStatusBar from "@/components/dashboard/top-status-bar";

export default function Home() {
  return (
    <BotSimulationProvider>
      <TooltipProvider>
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-ink">
          <TopStatusBar />

          <main className="flex min-h-0 flex-1 gap-2 px-2 py-2">
            <MetricsPanel />
            <div className="relative min-w-0 flex-1">
              <ThreadGraph />
            </div>
            <ModuleGrid />
          </main>

          <section className="grid h-[36%] min-h-[212px] shrink-0 grid-cols-[1.02fr_1fr_1.06fr] gap-2 px-2 pb-2">
            <RunLog />
            <DispatchPanel />
            <TelemetryPanel />
          </section>

          <CliBar />
        </div>
      </TooltipProvider>
    </BotSimulationProvider>
  );
}
