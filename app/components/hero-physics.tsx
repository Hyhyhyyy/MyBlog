"use client";

// hero-physics.tsx — pale, dense, line-only water-ripple grid that reacts to
// the cursor. Rendered once from the root layout so it sits behind EVERY page.
//
// Physics: each grid layer is a 2D wave field (height h, previous hp). A slow
// sine "drift" keeps the mesh breathing on its own when idle; the cursor
// injects energy into the wave field, which then propagates as expanding
// concentric ripples drawn as warped grid lines. No dots — just lines. Three
// pale layers at different (dense) spacing give a soft sense of depth. The
// canvas paints the paper colour itself so it works as a global background.
// Honors prefers-reduced-motion by drawing one calm static frame.

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
  rgb: string;
};

// Far → near. Dense spacing for a fine water-line mesh; all pale/light.
const LAYER_DEFS = [
  { spacing: 58, flowAmp: 12, flowSpeed: 0.00040, reactive: 0.55, lineAlpha: 0.022, rgb: "196,190,178" },
  { spacing: 38, flowAmp: 9, flowSpeed: 0.00062, reactive: 0.8, lineAlpha: 0.040, rgb: "190,156,144" },
  { spacing: 28, flowAmp: 6, flowSpeed: 0.00095, reactive: 1.0, lineAlpha: 0.064, rgb: "214,142,112" },
];

const PAPER = "#f3efe6"; // matches the site paper colour
const RIPPLE_DAMP = 0.96; // wave energy retained per step (water-like, travels far)
const RIPPLE_GAIN = 1.15; // wave slope → line displacement (bigger warp = clearer waves)
const RIPPLE_INJECT = 0.95; // cursor energy injected per frame (visible on a light pass)
const RIPPLE_GLOW = 0.020; // |height| → brightness boost per unit
const MAXH = 36; // clamp so ripples stay subtle & stable

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
      const scale = W < 720 ? 1.4 : W < 1100 ? 1.1 : 1;
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

        // --- grid LINES only (warped by the ripple → visible rings) ---
        ctx.lineWidth = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const glow = Math.min(0.22, Math.abs(h[i]) * RIPPLE_GLOW);
            if (c < cols - 1) {
              const m = i + 1;
              const g2 = Math.min(0.22, Math.abs(h[m]) * RIPPLE_GLOW);
              ctx.strokeStyle = `rgba(${L.rgb},${(L.lineAlpha + Math.max(glow, g2)).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(px[m], py[m]); ctx.stroke();
            }
            if (r < rows - 1) {
              const m = i + cols;
              const g2 = Math.min(0.22, Math.abs(h[m]) * RIPPLE_GLOW);
              ctx.strokeStyle = `rgba(${L.rgb},${(L.lineAlpha + Math.max(glow, g2)).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(px[m], py[m]); ctx.stroke();
            }
          }
        }
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
