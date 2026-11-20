export type VizKind =
  | "files"
  | "tree"
  | "grid-check"
  | "skeleton"
  | "equalizer"
  | "rules"
  | "checks"
  | "bars"
  | "output";

export interface ModuleDef {
  id: string;
  label: string;
  short: string;
  icon: string;
  viz: VizKind;
  total: number;
  unit: string;
}

/**
 * ETH/USDT trading pipeline — nine stages the orchestrator walks through
 * on every signal cycle.
 */
export const MODULES: ModuleDef[] = [
  { id: "feed", label: "Feed L2", short: "ws-feed", icon: "Radio", viz: "files", total: 2500, unit: "msg/s" },
  { id: "orderbook", label: "Order Book", short: "depth-agg", icon: "Layers", viz: "tree", total: 25, unit: "levels" },
  { id: "indicators", label: "Indicators", short: "ta-suite", icon: "Activity", viz: "equalizer", total: 14, unit: "series" },
  { id: "signal", label: "Signal Engine", short: "strat-ens", icon: "Radar", viz: "grid-check", total: 6, unit: "signals" },
  { id: "risk", label: "Risk Manager", short: "risk-guard", icon: "ShieldCheck", viz: "rules", total: 8, unit: "checks" },
  { id: "sizing", label: "Position Sizing", short: "sizer", icon: "SlidersHorizontal", viz: "skeleton", total: 4, unit: "steps" },
  { id: "router", label: "Smart Router", short: "route-v2", icon: "Waypoints", viz: "bars", total: 12, unit: "routes" },
  { id: "execution", label: "Execution / OMS", short: "order-exec", icon: "Send", viz: "checks", total: 40, unit: "orders" },
  { id: "pnl", label: "PnL / Telemetry", short: "pnl-sync", icon: "Gauge", viz: "output", total: 1, unit: "ledger" },
];

export const STAGE_LABELS = MODULES.map((m) => m.short);
