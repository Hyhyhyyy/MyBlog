"use client";

// hero-physics.tsx — lightweight, pale, always-flowing grid that ripples under
// the cursor. Rendered once from the root layout so it sits behind EVERY page.
//
// Physics: each grid layer is a 2D wave field (height h, previous hp). A slow
// sine "drift" makes the whole grid breathe on its own when idle; the cursor
// injects energy into the wave field, which then propagates as expanding
// concentric ripples (a real wave equation, not just a local dent). Three
// faint, pale layers at different spacing give a soft sense of depth. The
// canvas paints the paper colour itself so it works as a global page
// background. Honors prefers-reduced-motion by drawing one calm static frame.

import { useEffect, useRef } from "react";

type Layer = {
  h: Float32Array; // current wave height
  hp: Float32Array; // previous wave height
  nh: Float32Array; // scratch buffer
  bx: Float32Array; // base grid x
  by: Float32Array; // base grid y
  px: Float32Array; // rendered x (drift + ripple)
  py: Float32Array; // rendered y (drift + ripple)
  phase: Float32Array; // per-node drift phase
  cols: number;
  rows: number;
  spacing: number;
  flowAmp: number;
  flowSpeed: number;
  reactive: number;
  lineAlpha: number;
  dotR: number;
  rgb: string;
  dotAlpha: number;
};

// Far → near. All very pale / light for an airy, "轻盈" feel.
const LAYER_DEFS = [
  { spacing: 96, flowAmp: 9, flowSpeed: 0.00040, reactive: 0.5, lineAlpha: 0.028, dotR: 0.8, rgb: "198,192,180", dotAlpha: 0.10 },
  { spacing: 68, flowAmp: 7, flowSpeed: 0.00062, reactive: 0.8, lineAlpha: 0.052, dotR: 1.2, rgb: "188,154,142", dotAlpha: 0.15 },
  { spacing: 50, flowAmp: 5, flowSpeed: 0.00095, reactive: 1.0, lineAlpha: 0.085, dotR: 1.7, rgb: "214,142,112", dotAlpha: 0.23 },
];

const PAPER = "#f3efe6"; // matches the site paper colour
const RIPPLE_DAMP = 0.94; // wave energy retained per step (water-like)
const RIPPLE_GAIN = 0.55; // wave slope → node displacement
const RIPPLE_INJECT = 0.5; // cursor energy injected per frame
const RIPPLE_GLOW = 0.011; // |height| → brightness boost per unit
const MAXH = 24; // clamp so ripples stay subtle & stable

export default function HeroPhysics({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let layers: Layer[] = [];
    let raf = 0;
    let idleTimer: number | undefined;
    const mouse = { x: -9999, y: -9999, active: false };

    const build = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      if (W < 2 || H < 2) return;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // fewer nodes on small / high-density screens.
      const scale = W < 720 ? 1.5 : W < 1100 ? 1.15 : 1;
      layers = LAYER_DEFS.map((def) => {
        const spacing = def.spacing * scale;
        const cols = Math.ceil(W / spacing) + 2;
        const rows = Math.ceil(H / spacing) + 2;
        const ox = (W - (cols - 1) * spacing) / 2;
        const oy = (H - (rows - 1) * spacing) / 2;
        const n = cols * rows;
        const bx = new Float32Array(n), by = new Float32Array(n), phase = new Float32Array(n);
        for (let rr = 0; rr < rows; rr++) {
          for (let c = 0; c < cols; c++) {
            const i = rr * cols + c;
            bx[i] = ox + c * spacing;
            by[i] = oy + rr * spacing;
            phase[i] = Math.random() * Math.PI * 2;
          }
        }
        return {
          ...def, cols, rows, spacing,
          h: new Float32Array(n), hp: new Float32Array(n), nh: new Float32Array(n),
          bx, by, px: new Float32Array(n), py: new Float32Array(n), phase,
        };
      });
    };

    const stepAndDraw = (t: number) => {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);

      for (const L of layers) {
        const { cols, rows, h, hp, nh, bx, by, px, py, phase } = L;
        const n = cols * rows;
        const ox = bx[0], oy = by[0], sp = L.spacing;

        // --- inject cursor energy into the wave field (the ripple source) ---
        if (mouse.active) {
          const cc = Math.max(0, Math.min(cols - 1, Math.round((mouse.x - ox) / sp)));
          const cr = Math.max(0, Math.min(rows - 1, Math.round((mouse.y - oy) / sp)));
          const amp = RIPPLE_INJECT * L.reactive;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const r = cr + dr, c = cc + dc;
              if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
              const i = r * cols + c;
              const fall = dr === 0 && dc === 0 ? 1 : 0.5;
              h[i] += amp * fall;
              if (h[i] > MAXH) h[i] = MAXH; else if (h[i] < -MAXH) h[i] = -MAXH;
            }
          }
        }

        // --- propagate the wave (discrete wave equation, double-buffered) ---
        for (let i = 0; i < n; i++) {
          const c = i % cols, r = (i / cols) | 0;
          const l = c > 0 ? i - 1 : i;
          const rt = c < cols - 1 ? i + 1 : i;
          const u = r > 0 ? i - cols : i;
          const d = r < rows - 1 ? i + cols : i;
          const lap = (h[l] + h[rt] + h[u] + h[d]) * 0.5 - hp[i];
          nh[i] = lap * RIPPLE_DAMP;
        }
        for (let i = 0; i < n; i++) { hp[i] = h[i]; h[i] = nh[i]; }

        // --- compute rendered positions: slow self-flow + ripple warp ---
        for (let i = 0; i < n; i++) {
          const c = i % cols, r = (i / cols) | 0;
          const l = c > 0 ? i - 1 : i;
          const rt = c < cols - 1 ? i + 1 : i;
          const u = r > 0 ? i - cols : i;
          const d = r < rows - 1 ? i + cols : i;
          const gx = h[l] - h[rt];
          const gy = h[u] - h[d];
          const hx = bx[i]
            + Math.sin(t * L.flowSpeed + phase[i]) * L.flowAmp
            + Math.sin(t * L.flowSpeed * 0.6 + phase[i] * 1.7) * L.flowAmp * 0.4;
          const hy = by[i]
            + Math.cos(t * L.flowSpeed * 0.9 + phase[i] * 1.3) * L.flowAmp * 0.7
            + Math.cos(t * L.flowSpeed * 0.5 + phase[i] * 0.7) * L.flowAmp * 0.3;
          px[i] = hx + gx * RIPPLE_GAIN;
          py[i] = hy + gy * RIPPLE_GAIN;
        }

        // --- grid lines (warped by the ripple → visible rings) ---
        ctx.lineWidth = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const glow = Math.min(0.18, Math.abs(h[i]) * RIPPLE_GLOW);
            if (c < cols - 1) {
              const m = i + 1;
              const g2 = Math.min(0.18, Math.abs(h[m]) * RIPPLE_GLOW);
              ctx.strokeStyle = `rgba(${L.rgb},${(L.lineAlpha + Math.max(glow, g2)).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(px[m], py[m]); ctx.stroke();
            }
            if (r < rows - 1) {
              const m = i + cols;
              const g2 = Math.min(0.18, Math.abs(h[m]) * RIPPLE_GLOW);
              ctx.strokeStyle = `rgba(${L.rgb},${(L.lineAlpha + Math.max(glow, g2)).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(px[m], py[m]); ctx.stroke();
            }
          }
        }

        // --- node dots (brighter where the ripple lifts them) ---
        for (let i = 0; i < n; i++) {
          const glow = Math.min(0.18, Math.abs(h[i]) * RIPPLE_GLOW);
          ctx.fillStyle = `rgba(${L.rgb},${(L.dotAlpha + glow).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px[i], py[i], L.dotR + glow * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- faint glow that follows the cursor (ripple centre) ---
      if (mouse.active) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 150);
        g.addColorStop(0, "rgba(232,176,75,0.06)");
        g.addColorStop(1, "rgba(232,176,75,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 150, 0, Math.PI * 2); ctx.fill();
      }
    };

    build();

    const onMove = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const p = "touches" in e ? e.touches[0] : e;
      if (!p) return;
      mouse.x = p.clientX - r.left;
      mouse.y = p.clientY - r.top;
      mouse.active = true;
      // ripple relaxes when the cursor goes still.
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { mouse.active = false; }, 140);
    };
    const onLeave = () => { mouse.active = false; };
    const onResize = () => { dpr = Math.min(window.devicePixelRatio || 1, 2); build(); };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseout", (e) => { if (!e.relatedTarget) onLeave(); });
    window.addEventListener("resize", onResize);

    if (reduce) {
      // CSS leaves the canvas visible; draw one calm static frame, no loop.
      stepAndDraw(0);
      return () => {
        if (idleTimer) window.clearTimeout(idleTimer);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("mouseout", onLeave);
        window.removeEventListener("resize", onResize);
      };
    }

    const loop = (now: number) => {
      stepAndDraw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      if (idleTimer) window.clearTimeout(idleTimer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
