"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MODULES } from "@/lib/data";
import { clamp, formatClock } from "@/lib/utils";
import type { Accent } from "@/lib/theme";

export type Speed = 1 | 5;
export type ModuleStatus = "queued" | "running" | "done";

export interface Metric {
  label: string;
  value: string;
}

export interface ModuleState {
  id: string;
  status: ModuleStatus;
  progress: number;
  current: number;
  total: number;
  rate: number;
  metrics: Metric[];
}

export interface LogEntry {
  id: number;
  t: string;
  stage: string;
  msg: string;
}

export interface SimState {
  tick: number;
  elapsedMs: number;
  paused: boolean;
  speed: Speed;
  accent: Accent;
  cycle: number;
  wave: number;
  modules: ModuleState[];
  log: LogEntry[];
  eventsPerSecond: number;
  activeWorkers: number;
  nodes: number;
  ethPrice: number;
  priceOpen: number;
  pnl: number;
  equity: number;
  positionEth: number;
  notional: number;
  winRate: number;
  sharpe: number;
  fees: number;
  latencyMs: number;
  memPct: number;
  gpuPct: number;
  errors: number;
  ticksProcessed: number;
  signalsFired: number;
  ordersFilled: number;
  globalProgress: number;
  activeModuleId: string;
  pinnedModuleId: string | null;
  hoveredModuleId: string | null;
  working: string;
  spark: number[][];
}

interface MarketVars {
  tick: number;
  ethPrice: number;
  positionEth: number;
  pnl: number;
  fees: number;
  sharpe: number;
  latencyMs: number;
  ordersFilled: number;
}

const SPARK_LEN = 44;
const STEP = 0.09;
const WIDTH = 0.3;
const CYCLE_END = (MODULES.length - 1) * STEP + WIDTH; // 1.02

function buildMetrics(id: string, m: MarketVars): Metric[] {
  const t = m.tick;
  switch (id) {
    case "feed":
      return [
        { label: "latency", value: `${m.latencyMs.toFixed(1)}ms` },
        { label: "book", value: "25 lv" },
        { label: "trades/s", value: `${(7.8 + Math.sin(t / 5) * 1.6).toFixed(1)}k` },
        { label: "gap", value: "0.02%" },
      ];
    case "orderbook":
      return [
        { label: "bid", value: (m.ethPrice - 0.9).toFixed(2) },
        { label: "ask", value: (m.ethPrice + 0.8).toFixed(2) },
        { label: "spread", value: `${(1.8 + Math.abs(Math.sin(t / 6)) * 1.7).toFixed(1)} bps` },
        { label: "imbal", value: `${Math.round(56 + Math.sin(t / 9) * 12)}%` },
      ];
    case "indicators":
      return [
        { label: "rsi-14", value: (50 + Math.sin(t / 7) * 22).toFixed(1) },
        { label: "ema-200", value: (m.ethPrice - 14 + Math.sin(t / 11) * 6).toFixed(1) },
        { label: "atr", value: (10 + Math.abs(Math.sin(t / 8)) * 6).toFixed(1) },
        { label: "macd", value: (Math.sin(t / 9) * 1.2).toFixed(2) },
      ];
    case "signal":
      return [
        { label: "bias", value: Math.sin(t / 13) > 0 ? "LONG" : "SHORT" },
        { label: "score", value: (0.62 + Math.abs(Math.sin(t / 10)) * 0.28).toFixed(2) },
        { label: "conf", value: `${Math.round(70 + Math.abs(Math.sin(t / 12)) * 20)}%` },
        { label: "tf", value: "5m" },
      ];
    case "risk":
      return [
        { label: "exposure", value: `${Math.round(clamp(30 + Math.sin(t / 11) * 14, 6, 58))}%` },
        { label: "cap", value: "60%" },
        { label: "drawdown", value: `${(2.4 + Math.abs(Math.sin(t / 15)) * 2).toFixed(1)}%` },
        { label: "lev", value: "1.0x" },
      ];
    case "sizing":
      return [
        { label: "size", value: `${m.positionEth.toFixed(2)} ETH` },
        { label: "notional", value: `$${((m.positionEth * m.ethPrice) / 1000).toFixed(2)}k` },
        { label: "risk", value: "1.0%" },
        { label: "kelly", value: (0.38 + Math.abs(Math.sin(t / 14)) * 0.14).toFixed(2) },
      ];
    case "router":
      return [
        { label: "venue", value: "BINANCE" },
        { label: "fee", value: "4.0 bps" },
        { label: "slip", value: `${(1.0 + Math.abs(Math.sin(t / 9)) * 0.8).toFixed(1)} bps` },
        { label: "ttl", value: `${900 + Math.round(Math.sin(t / 6) * 120)}ms` },
      ];
    case "execution":
      return [
        { label: "open", value: String(Math.round(1 + Math.abs(Math.sin(t / 7)) * 3)) },
        { label: "fills", value: String(Math.round(m.ordersFilled)) },
        { label: "fill%", value: `${Math.round(92 + Math.abs(Math.sin(t / 8)) * 7)}%` },
        { label: "cancel", value: String(Math.round(Math.abs(Math.sin(t / 17)) * 2)) },
      ];
    case "pnl":
      return [
        { label: "realized", value: `${m.pnl >= 0 ? "+" : "-"}$${Math.abs(m.pnl).toFixed(2)}` },
        { label: "unreal", value: `+$${(Math.abs(Math.sin(t / 10)) * 48).toFixed(2)}` },
        { label: "fees", value: `$${m.fees.toFixed(2)}` },
        { label: "sharpe", value: m.sharpe.toFixed(2) },
      ];
    default:
      return [];
  }
}

function startMessage(id: string, m: MarketVars): string {
  switch (id) {
    case "feed":
      return `ETH/USDT L2 snapshot · 25 levels · ${m.latencyMs.toFixed(0)}ms`;
    case "orderbook":
      return `depth rebuilt · spread ${(1.8 + Math.abs(Math.sin(m.tick / 6)) * 1.7).toFixed(1)} bps`;
    case "indicators":
      return `ta-suite recomputed · RSI ${(50 + Math.sin(m.tick / 7) * 22).toFixed(1)} · ATR ok`;
    case "signal":
      return `ensemble vote → ${Math.sin(m.tick / 13) > 0 ? "LONG" : "SHORT"} bias · score ${(0.62 + Math.abs(Math.sin(m.tick / 10)) * 0.28).toFixed(2)}`;
    case "risk":
      return `pre-trade guard passed · exposure ${Math.round(clamp(30 + Math.sin(m.tick / 11) * 14, 6, 58))}% < cap 60%`;
    case "sizing":
      return `sized ${m.positionEth.toFixed(2)} ETH · risk 1.0% · kelly ${(0.38 + Math.abs(Math.sin(m.tick / 14)) * 0.14).toFixed(2)}`;
    case "router":
      return `route → BINANCE · fee 4.0bps · est slip ${(1.0 + Math.abs(Math.sin(m.tick / 9)) * 0.8).toFixed(1)}bps`;
    case "execution":
      return `order placed · ${Math.sin(m.tick / 13) > 0 ? "BUY" : "SELL"} ${(m.positionEth / 2).toFixed(2)} ETH @ ${m.ethPrice.toFixed(2)}`;
    case "pnl":
      return `ledger sync · realized ${m.pnl >= 0 ? "+" : "-"}$${Math.abs(m.pnl).toFixed(2)} · sharpe ${m.sharpe.toFixed(2)}`;
    default:
      return "tick";
  }
}

function makeInitialState(): SimState {
  const baseMarket: MarketVars = {
    tick: 0,
    ethPrice: 3412.84,
    positionEth: 0.85,
    pnl: 0,
    fees: 0,
    sharpe: 2.4,
    latencyMs: 12,
    ordersFilled: 0,
  };
  const modules: ModuleState[] = MODULES.map((m) => ({
    id: m.id,
    status: "queued",
    progress: 0,
    current: 0,
    total: m.total,
    rate: 0,
    metrics: buildMetrics(m.id, baseMarket),
  }));

  return {
    tick: 0,
    elapsedMs: 0,
    paused: false,
    speed: 1,
    accent: "blue",
    cycle: 1,
    wave: 0,
    modules,
    log: [
      { id: 1, t: formatClock(0), stage: "boot", msg: "eth-orchestrator online — 9 modules registered" },
      { id: 2, t: formatClock(0), stage: "connect", msg: "ws://binance · ETH/USDT stream subscribed (l2 + tape)" },
    ],
    eventsPerSecond: 0,
    activeWorkers: 0,
    nodes: MODULES.length,
    ethPrice: 3412.84,
    priceOpen: 3371.1,
    pnl: 0,
    equity: 25000,
    positionEth: 0.85,
    notional: 0.85 * 3412.84,
    winRate: 0.66,
    sharpe: 2.4,
    fees: 0,
    latencyMs: 12,
    memPct: 34,
    gpuPct: 26,
    errors: 0,
    ticksProcessed: 0,
    signalsFired: 0,
    ordersFilled: 0,
    globalProgress: 0,
    activeModuleId: MODULES[0].id,
    pinnedModuleId: null,
    hoveredModuleId: null,
    working: MODULES[0].label,
    spark: Array.from({ length: 4 }, () =>
      Array.from({ length: SPARK_LEN }, () => 32),
    ),
  };
}

function advance(prev: SimState, dtMs: number): SimState {
  if (prev.paused) return prev;

  const dt = dtMs / 1000;
  const tick = prev.tick + 1;
  const elapsedMs = prev.elapsedMs + dtMs;

  // --- market random walk (mean-reverting around 3412) ---
  const ethPrice = clamp(
    prev.ethPrice + (3412 - prev.ethPrice) * 0.035 + (Math.random() - 0.5) * 1.4,
    3300,
    3560,
  );
  const pnl = prev.pnl + (Math.random() - 0.32) * 2.0;
  const positionEth = 0.55 + Math.abs(Math.sin(tick / 46)) * 0.7;
  const notional = positionEth * ethPrice;
  const winRate = clamp(0.62 + Math.sin(tick / 31) * 0.06, 0.5, 0.82);
  const sharpe = 2.1 + Math.sin(tick / 40) * 0.5;
  const fees = prev.fees + 0.002 * positionEth;
  const latencyMs = 8 + Math.abs(Math.sin(tick / 3.2)) * 20 + Math.random() * 5;
  const memPct = Math.round(clamp(38 + Math.sin(tick / 6.5) * 9 + Math.random() * 4, 8, 92));
  const gpuPct = Math.round(clamp(30 + Math.abs(Math.sin(tick / 4.4)) * 26 + Math.random() * 6, 0, 98));
  const equity = 25000 + pnl;

  const mkt: MarketVars = {
    tick,
    ethPrice,
    positionEth,
    pnl,
    fees,
    sharpe,
    latencyMs,
    ordersFilled: prev.ordersFilled,
  };

  // --- pipeline wave: overlapping stages, ~3 workers active at once ---
  const rawWave = prev.wave + 0.006 * prev.speed;
  const completed = rawWave >= CYCLE_END;
  const wave = completed ? 0 : rawWave;
  const cycle = completed ? prev.cycle + 1 : prev.cycle;

  const modules: ModuleState[] = MODULES.map((def, i) => {
    const start = i * STEP;
    const p = clamp((wave - start) / WIDTH, 0, 1);
    const status: ModuleStatus = p <= 0 ? "queued" : p >= 1 ? "done" : "running";
    return {
      id: def.id,
      status,
      progress: p * 100,
      current: Math.round(p * def.total),
      total: def.total,
      rate: status === "running" ? def.total * (0.4 + Math.random() * 0.6) : 0,
      metrics: buildMetrics(def.id, mkt),
    };
  });

  // active stage = running module with the most progress
  let activeIndex = 0;
  let best = -1;
  modules.forEach((mod, i) => {
    if (mod.status === "running" && mod.progress > best) {
      best = mod.progress;
      activeIndex = i;
    }
  });
  if (best < 0) {
    const next = modules.findIndex((mod) => mod.status !== "done");
    activeIndex = next < 0 ? MODULES.length - 1 : next;
  }

  const activeWorkers = modules.filter((m) => m.status === "running").length;
  const eventsPerSecond = Math.round(
    (16 + activeWorkers * 30 + Math.random() * 24) * prev.speed,
  );
  const globalProgress = clamp((wave / CYCLE_END) * 100, 0, 100);
  const ticksProcessed = prev.ticksProcessed + Math.round((1 + activeWorkers * 2) * prev.speed);
  const ordersFilled =
    prev.ordersFilled +
    (Math.random() < 0.09 ? 1 : 0) +
    (cycle !== prev.cycle ? 1 : 0);
  const signalsFired =
    prev.signalsFired + (cycle !== prev.cycle ? 1 : 0) + (Math.random() < 0.03 ? 1 : 0);

  // --- sparklines (normalised 0..100 heights) ---
  const spark = prev.spark.map((series, idx) => {
    let v: number;
    if (idx === 0) v = ((ethPrice - 3330) / (3520 - 3330)) * 100;
    else if (idx === 1) v = ((pnl + 130) / 260) * 100;
    else if (idx === 2) v = (positionEth / 1.3) * 100;
    else v = (latencyMs / 38) * 100;
    return [...series.slice(1), clamp(v, 6, 100)];
  });

  // --- log stream ---
  const logs = [...prev.log];
  let lastId = prev.log[prev.log.length - 1]?.id ?? 0;
  const push = (stage: string, msg: string) => {
    lastId += 1;
    logs.push({ id: lastId, t: formatClock(elapsedMs), stage, msg });
  };

  modules.forEach((mod, i) => {
    const before = prev.modules[i]?.status;
    const def = MODULES[i];
    if (before === "queued" && mod.status === "running") {
      push(def.short, startMessage(def.id, mkt));
    } else if (before === "running" && mod.status === "done") {
      push(def.short, `✓ batch complete · ${def.total} ${def.unit}`);
    }
  });
  if (completed) push("cycle", `pipeline run #${cycle} settled · ledger flushed`);
  if (tick % 11 === 0) {
    push(
      "telemetry",
      `heartbeat · ${Math.round(16 + activeWorkers * 30)} ev/s · ${activeWorkers} workers`,
    );
  }
  if (logs.length > 110) logs.splice(0, logs.length - 110);

  return {
    ...prev,
    tick,
    elapsedMs,
    wave,
    cycle,
    modules,
    log: logs,
    eventsPerSecond,
    activeWorkers,
    nodes: MODULES.length + activeWorkers,
    ethPrice,
    pnl,
    equity,
    positionEth,
    notional,
    winRate,
    sharpe,
    fees,
    latencyMs,
    memPct,
    gpuPct,
    ticksProcessed,
    signalsFired,
    ordersFilled,
    globalProgress,
    activeModuleId: MODULES[activeIndex].id,
    working: MODULES[activeIndex].label,
    spark,
  };
}

interface BotSimulationApi {
  state: SimState;
  focusedModuleId: string;
  togglePause: () => void;
  setSpeed: (s: Speed) => void;
  setAccent: (a: Accent) => void;
  reset: () => void;
  pinModule: (id: string | null) => void;
  setHovered: (id: string | null) => void;
}

const BotSimulationContext = createContext<BotSimulationApi | null>(null);

export function BotSimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimState>(makeInitialState);
  const lastNow = useRef(0);

  useEffect(() => {
    lastNow.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - lastNow.current, 400);
      lastNow.current = now;
      setState((prev) => advance(prev, dt));
    }, 160);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("accent");
    if (q === "amber" || q === "blue") {
      setState((p) => ({ ...p, accent: q }));
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", state.accent);
  }, [state.accent]);

  const togglePause = useCallback(
    () => setState((p) => ({ ...p, paused: !p.paused })),
    [],
  );
  const setSpeed = useCallback(
    (s: Speed) => setState((p) => ({ ...p, speed: s })),
    [],
  );
  const setAccent = useCallback(
    (a: Accent) => setState((p) => ({ ...p, accent: a })),
    [],
  );
  const reset = useCallback(() => {
    lastNow.current = performance.now();
    setState(makeInitialState());
  }, []);
  const pinModule = useCallback(
    (id: string | null) =>
      setState((p) => ({
        ...p,
        pinnedModuleId: p.pinnedModuleId === id ? null : id,
      })),
    [],
  );
  const setHovered = useCallback(
    (id: string | null) =>
      setState((p) => (p.hoveredModuleId === id ? p : { ...p, hoveredModuleId: id })),
    [],
  );

  const focusedModuleId =
    state.pinnedModuleId ?? state.hoveredModuleId ?? state.activeModuleId;

  const value = useMemo<BotSimulationApi>(
    () => ({
      state,
      focusedModuleId,
      togglePause,
      setSpeed,
      setAccent,
      reset,
      pinModule,
      setHovered,
    }),
    [
      state,
      focusedModuleId,
      togglePause,
      setSpeed,
      setAccent,
      reset,
      pinModule,
      setHovered,
    ],
  );

  return (
    <BotSimulationContext.Provider value={value}>
      {children}
    </BotSimulationContext.Provider>
  );
}

export function useBotSimulation() {
  const ctx = useContext(BotSimulationContext);
  if (!ctx) {
    throw new Error("useBotSimulation must be used inside <BotSimulationProvider>");
  }
  return ctx;
}
