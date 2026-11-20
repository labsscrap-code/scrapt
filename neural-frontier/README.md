# eth-orchestrator — live telemetry HUD

Dashboard de telemetría y orquestación en tiempo real para un **bot de trading de ETH/USDT**.
Estética de consola viva: canvas de hilos con partículas, matriz 3×3 de workers, RUN LOG / DISPATCH / OUTPUT y CLI activa.

## Stack

- **Next.js 15 (App Router)** — una página, componentes de cliente.
- **Tailwind CSS 3.4** — paleta en variables CSS (`rgb(... / <alpha-value>)`).
- **shadcn/ui** — componentes copiados y re-estilizados (`components/ui`).
- **Radix** — dropdown-menu, tooltip, slot.
- **Lucide** — iconografía.
- **Canvas 2D** — bus vertical, curvas Bézier, partículas y badges (60 fps vía `requestAnimationFrame`).

## Ejecutar

```bash
pnpm install
pnpm dev        # http://localhost:3000
# o
pnpm build && pnpm start
```

## Estructura

```
app/
  layout.tsx          # fuente JetBrains Mono + metadata
  page.tsx            # layout h-screen: top bar / main / panels / CLI
  globals.css         # paleta, scrollbars, animaciones
components/
  ui/                 # button, badge, card, dropdown-menu, tooltip (shadcn)
  dashboard/
    top-status-bar.tsx    # nodos, ev/s, workers, latencia, reloj ms, accent toggle
    metrics-panel.tsx     # 4 tarjetas + sparklines (equalizer)
    thread-graph.tsx      # canvas: bus + béziers + partículas + badges
    module-grid.tsx       # matriz 3×3
    module-card.tsx       # header/estado/menú + 4 métricas + mini-viz
    module-viz.tsx        # 9 visualizaciones distintas (files, tree, checks…)
    run-log.tsx           # stream de eventos
    dispatch-panel.tsx    # 9 barras de progreso
    telemetry-panel.tsx   # KPI PnL + pipeline + working
    cli-bar.tsx           # prompt, play/pause, 1x/5x, reset
hooks/
  use-bot-simulation.tsx  # motor: ticks cada 160 ms, estado compartido por contexto
lib/
  data.ts             # 9 etapas del pipeline ETH
  theme.ts            # colores del canvas por acento
  utils.ts            # cn, clamp, formatClock, formatUsd, formatCompact
```

## Pipeline simulado (9 etapas)

`ws-feed → depth-agg → ta-suite → strat-ens → risk-guard → sizer → route-v2 → order-exec → pnl-sync`

Cada ciclo avanza en oleadas solapadas (≈3 workers activos a la vez). El foco salta automáticamente a la etapa
en ejecución con más progreso; **hover** ilumina esa rama del grafo y **clic** la fija (pin).

## Controles

| Acción | Efecto |
| --- | --- |
| `BLUE` / `AMBER` | cambia el acento (CSS vars + canvas) |
| `?accent=amber` | deep-link directo al tema ámbar |
| `1x` / `5x` | velocidad de avance del pipeline |
| `pause` / `play` | congela o reanuda la simulación y el reloj |
| `reset` | reinicia contadores y log |
| hover / clic en módulo | ilumina y acelera las partículas de esa rama |

## Conectar datos reales

Todo el estado vive en `BotSimulationProvider` y se consume con `useBotSimulation()`.
Para pasar a datos reales, sustituye el `setInterval` de `advance()` por un `WebSocket` o `EventSource`
que aplique deltas al mismo objeto `SimState` — los componentes no necesitan cambios:

```ts
useEffect(() => {
  const es = new EventSource("/api/telemetry");
  es.onmessage = (e) => setState((prev) => mergeTelemetry(prev, JSON.parse(e.data)));
  return () => es.close();
}, []);
```

## Notas

- Sin scroll de página: `h-screen overflow-hidden`; el scroll interno está limitado a RUN LOG y DISPATCH.
- Los números, timestamps y precios usan `font-mono` + `tabular-nums`.
- El canvas se re-mide cada 240 ms para que las curvas sigan a las tarjetas reales en cualquier tamaño.
