"use client";

import { useEffect, useRef } from "react";
import { useBotSimulation } from "@/hooks/use-bot-simulation";
import { MODULES, STAGE_LABELS } from "@/lib/data";
import { ACCENT_HEX, type Accent } from "@/lib/theme";

interface Particle {
  p: number;
  li: number;
  ri: number;
  speed: number;
  size: number;
}

function cubic(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export default function ThreadGraph() {
  const { state, focusedModuleId } = useBotSimulation();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveRef = useRef({ state, focusedModuleId });
  liveRef.current = { state, focusedModuleId };

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let leftY: number[] = [];
    let rightY: number[] = [];
    let lastMeasure = 0;
    let lastFrame = performance.now();
    const particles: Particle[] = [];

    let gradAccent: Accent | null = null;
    let gradW = -1;
    let gradH = -1;
    let bgGrad: CanvasGradient | null = null;
    let busGrad: CanvasGradient | null = null;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const measure = () => {
      const wr = wrap.getBoundingClientRect();
      const ls = Array.from(
        document.querySelectorAll<HTMLElement>('[data-anchor^="L"]'),
      );
      const rs = Array.from(
        document.querySelectorAll<HTMLElement>('[data-anchor^="R"]'),
      );
      leftY = ls.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 - wr.top;
      });
      rightY = rs.map((el, idx) => {
        const r = el.getBoundingClientRect();
        const col = idx % 3;
        return r.top + r.height / 2 - wr.top + (col - 1) * 9;
      });
      if (leftY.length === 0) leftY = [0.16, 0.4, 0.64, 0.88].map((f) => f * h);
      if (rightY.length === 0) {
        rightY = Array.from(
          { length: 9 },
          (_, i) => [0.16, 0.5, 0.84][Math.floor(i / 3)] * h,
        );
      }
    };

    const ro = new ResizeObserver(() => {
      resize();
      measure();
    });
    ro.observe(wrap);
    resize();
    measure();

    const roundRectPath = (
      x: number,
      y: number,
      wd: number,
      ht: number,
      r: number,
    ) => {
      const rr = Math.min(r, wd / 2, ht / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + wd, y, x + wd, y + ht, rr);
      ctx.arcTo(x + wd, y + ht, x, y + ht, rr);
      ctx.arcTo(x, y + ht, x, y, rr);
      ctx.arcTo(x, y, x + wd, y, rr);
      ctx.closePath();
    };

    const pointAt = (li: number, ri: number, p: number) => {
      const yL = leftY[li] ?? h * 0.5;
      const yR = rightY[ri] ?? h * 0.5;
      const busX = w * 0.42;
      if (p < 0.3) {
        const u = p / 0.3;
        return {
          x: cubic(0, busX * 0.42, busX * 0.62, busX, u),
          y: cubic(yL, yL - 8, yL + 8, yL, u),
        };
      }
      if (p < 0.55) {
        const u = (p - 0.3) / 0.25;
        return { x: busX + Math.sin(u * Math.PI) * 2.2, y: yL + (yR - yL) * u };
      }
      const u = (p - 0.55) / 0.45;
      return {
        x: cubic(busX, busX + (w - busX) * 0.4, busX + (w - busX) * 0.62, w, u),
        y: cubic(yR, yR - 8, yR + 8, yR, u),
      };
    };

    const draw = (now: number) => {
      const dt = Math.min(now - lastFrame, 48);
      lastFrame = now;
      if (now - lastMeasure > 240) {
        measure();
        lastMeasure = now;
      }

      const { state: s, focusedModuleId: focusId } = liveRef.current;
      const acc = ACCENT_HEX[s.accent];
      const [ar, ag, ab] = acc.rgb;
      const [sr, sg, sb] = acc.softRgb;
      const busX = w * 0.42;
      const focusIdx = MODULES.findIndex((m) => m.id === focusId);

      if (gradAccent !== s.accent || gradW !== w || gradH !== h) {
        bgGrad = ctx.createRadialGradient(
          busX,
          h / 2,
          0,
          busX,
          h / 2,
          Math.max(w, h) * 0.62,
        );
        bgGrad.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.055)`);
        bgGrad.addColorStop(1, "rgba(0,0,0,0)");
        busGrad = ctx.createLinearGradient(0, 0, 0, h);
        busGrad.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.04)`);
        busGrad.addColorStop(0.5, `rgba(${ar}, ${ag}, ${ab}, 0.55)`);
        busGrad.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0.04)`);
        gradAccent = s.accent;
        gradW = w;
        gradH = h;
      }

      ctx.clearRect(0, 0, w, h);
      if (bgGrad) {
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      }

      if (busGrad) {
        ctx.save();
        ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, 0.8)`;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = busGrad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(busX, 0);
        ctx.lineTo(busX, h);
        ctx.stroke();
        ctx.restore();
      }

      leftY.forEach((y, i) => {
        const hot =
          focusIdx >= 0 && leftY.length > 0 && i === focusIdx % leftY.length;
        for (let k = -1; k <= 1; k += 1) {
          const off = k * 4;
          ctx.beginPath();
          ctx.moveTo(0, y + off * 0.4);
          ctx.bezierCurveTo(
            busX * 0.42,
            y + off - 8,
            busX * 0.62,
            y + off + 8,
            busX,
            y + off,
          );
          if (hot) {
            ctx.save();
            ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, 0.9)`;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${k === 0 ? 0.62 : 0.28})`;
            ctx.lineWidth = k === 0 ? 1.3 : 0.8;
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${k === 0 ? 0.16 : 0.075})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      });

      rightY.forEach((y, i) => {
        const hot = i === focusIdx;
        for (let k = -1; k <= 1; k += 1) {
          const off = k * 4;
          ctx.beginPath();
          ctx.moveTo(busX, y + off);
          ctx.bezierCurveTo(
            busX + (w - busX) * 0.4,
            y + off - 8,
            busX + (w - busX) * 0.62,
            y + off + 8,
            w,
            y + off,
          );
          if (hot) {
            ctx.save();
            ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, 1)`;
            ctx.shadowBlur = 12;
            ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${k === 0 ? 0.85 : 0.4})`;
            ctx.lineWidth = k === 0 ? 1.5 : 0.9;
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${k === 0 ? 0.14 : 0.065})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      });

      leftY.forEach((y) => {
        ctx.beginPath();
        ctx.arc(0.5, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, 0.35)`;
        ctx.fill();
      });
      rightY.forEach((y, i) => {
        const hot = i === focusIdx;
        ctx.beginPath();
        ctx.arc(w - 1, y, hot ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = hot
          ? `rgba(${sr}, ${sg}, ${sb}, 0.95)`
          : `rgba(${ar}, ${ag}, ${ab}, 0.3)`;
        ctx.fill();
      });

      const density = Math.min(1.8, Math.max(1, w / 640));
      const target = Math.round((36 + s.activeWorkers * 13) * density);
      let guard = 0;
      while (particles.length < target && guard < 14) {
        guard += 1;
        const ri =
          focusIdx >= 0 && Math.random() < 0.5
            ? focusIdx
            : Math.floor(Math.random() * Math.max(1, rightY.length));
        particles.push({
          p: Math.random() * 0.2,
          li: Math.floor(Math.random() * Math.max(1, leftY.length)),
          ri,
          speed: 0.15 + Math.random() * 0.1,
          size: 1 + Math.random() * 1.3,
        });
      }

      ctx.save();
      ctx.lineCap = "round";
      ctx.shadowColor = `rgba(${sr}, ${sg}, ${sb}, 0.8)`;
      ctx.shadowBlur = 7;
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const pt = particles[i];
        const hot = pt.ri === focusIdx;
        pt.p +=
          (dt / 1000) * pt.speed * (hot ? 2.3 : 1) * (0.7 + s.speed * 0.3);
        if (pt.p >= 1) {
          particles.splice(i, 1);
          continue;
        }
        const { x, y } = pointAt(pt.li, pt.ri, pt.p);
        const back = pointAt(pt.li, pt.ri, Math.max(0, pt.p - 0.05));
        ctx.beginPath();
        ctx.moveTo(back.x, back.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = hot
          ? `rgba(${sr}, ${sg}, ${sb}, 0.5)`
          : `rgba(${ar}, ${ag}, ${ab}, 0.3)`;
        ctx.lineWidth = pt.size;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, hot ? pt.size + 0.5 : pt.size, 0, Math.PI * 2);
        ctx.fillStyle = hot
          ? `rgba(${sr}, ${sg}, ${sb}, 0.98)`
          : `rgba(${ar}, ${ag}, ${ab}, 0.72)`;
        ctx.fill();
      }
      ctx.restore();

      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textBaseline = "middle";
      const badgeCount = 5;
      for (let i = 0; i < badgeCount; i += 1) {
        const label =
          STAGE_LABELS[(Math.floor(now / 1900) + i * 2) % STAGE_LABELS.length];
        const dir = i % 2 === 0 ? 1 : -1;
        const speed = 11 + (i % 3) * 4;
        const ph = 15;
        const margin = 16;
        const span = Math.max(40, h - margin * 2 - ph);
        const raw = (now / 1000) * speed * dir + (i / badgeCount) * span;
        const y = margin + ((((raw % span) + span) % span));
        const tw = ctx.measureText(label).width;
        const pw = tw + 22;
        const onRight = i % 2 === 0;
        const px = onRight ? busX + 13 : busX - 13 - pw;
        const py = y - ph / 2;
        const pulse = 0.22 + 0.32 * Math.abs(Math.sin(now / 850 + i));

        ctx.beginPath();
        ctx.moveTo(busX, y);
        ctx.lineTo(onRight ? px : px + pw, y);
        ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${pulse * 0.9})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        roundRectPath(px, py, pw, ph, 7);
        ctx.fillStyle = "rgba(8, 12, 20, 0.92)";
        ctx.fill();
        ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(onRight ? px + 6 : px + pw - 6, py + ph / 2, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${0.5 + pulse})`;
        ctx.fill();

        ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, 0.92)`;
        ctx.fillText(label, onRight ? px + 11 : px + 6, py + ph / 2 + 0.5);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="hud-grid absolute inset-0 overflow-hidden rounded-lg">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
