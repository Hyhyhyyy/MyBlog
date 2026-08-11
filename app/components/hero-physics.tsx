"use client";

// hero-physics.tsx — soft, pale, VERTICAL wavy lines that react to the cursor.
// Rendered once from the root layout so it sits behind EVERY page.
//
// Each vertical line carries a gentle standing sine wave (slowly drifting) so
// the background reads as a soft curtain of waves even at rest. A 2D wave
// field (height h, previous hp) is injected by the cursor and propagates as
// ripples that perturb the lines. No horizontal lines, no dots — only soft
// vertical waves. Three pale layers at different density give depth. The
// canvas paints the paper colour itself. Honors prefers-reduced-motion with a
// calm static frame.

import { useEffect, useRef } from "react";

type Layer = {
  h: Float32Array; // current wave height
  hp: Float32Array; // previous wave height
  nh: Float32Array; // scratch buffer
  bx: Float32Array; // base grid x
  by: Float32Array; // base grid y
  px: Float32Array; // rendered x (wave + ripple)
  py: Float32Array; // rendered y (drift + ripple)
  phase: Float32Array; // per-node drift phase
  cols: number;
  rows: number;
  spacing: number;
  flowAmp: number;
  flowSpeed: number;
  reactive: number;
  lineAlpha: number;
  waveAmp: number; // amplitude of the standing sine wave on each vertical line
  rgb: string;
};

// Far → near. Dense spacing for fine vertical water lines; deeper, warm tones.
const LAYER_DEFS = [
  { spacing: 58, flowAmp: 8, flowSpeed: 0.00040, reactive: 0.6, lineAlpha: 0.030, waveAmp: 5, rgb: "150,140,126" },
  { spacing: 38, flowAmp: 6, flowSpeed: 0.00062, reactive: 0.85, lineAlpha: 0.055, waveAmp: 7, rgb: "176,132,116" },
  { spacing: 28, flowAmp: 4, flowSpeed: 0.00095, reactive: 1.0, lineAlpha: 0.085, waveAmp: 9, rgb: "196,108,82" },
];

const PAPER = "#f3efe6"; // matches the site paper colour
const WAVE_K = 0.018; // spatial frequency of the standing wave along each line
const WAVE_SPEED = 0.0006; // slow drift of the wave
const RIPPLE_DAMP = 0.94; // wave energy retained per step (settles softly)
const RIPPLE_GAIN = 1.1; // ripple slope → line displacement (clear reaction)
const RIPPLE_INJECT = 0.9; // cursor energy injected per frame (strong reaction)
const RIPPLE_GLOW = 0.016; // |height| → brightness boost per unit
const MAXH = 30; // clamp so ripples stay subtle & stable

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

        // --- compute rendered positions: soft sine wave on each vertical line
        //     + slow drift + ripple warp ---
        for (let i = 0; i < n; i++) {
          const c = i % cols, r = (i / cols) | 0;
          const l = c > 0 ? i - 1 : i;
          const rt = c < cols - 1 ? i + 1 : i;
          const u = r > 0 ? i - cols : i;
          const d = r < rows - 1 ? i + cols : i;
          const gx = h[l] - h[rt];
          const gy = h[u] - h[d];
          // gentle standing wave travelling down each column (out of phase per column)
          const wave = Math.sin(by[i] * WAVE_K + t * WAVE_SPEED + c * 0.6) * L.waveAmp;
          const hx = bx[i]
            + Math.sin(t * L.flowSpeed + phase[i]) * L.flowAmp * 0.5
            + Math.sin(t * L.flowSpeed * 0.6 + phase[i] * 1.7) * L.flowAmp * 0.2
            + wave;
          const hy = by[i]
            + Math.cos(t * L.flowSpeed * 0.9 + phase[i] * 1.3) * L.flowAmp * 0.4
            + Math.cos(t * L.flowSpeed * 0.5 + phase[i] * 0.7) * L.flowAmp * 0.15;
          px[i] = hx + gx * RIPPLE_GAIN;
          py[i] = hy + gy * RIPPLE_GAIN;
        }

        // --- VERTICAL lines only, drawn as smooth curves (soft wavy curtain) ---
        ctx.lineWidth = 1;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        for (let c = 0; c < cols; c++) {
          // smooth path through the column's points (quadratic via midpoints)
          ctx.beginPath();
          ctx.moveTo(px[c], py[c]);
          let maxH = Math.abs(h[c]);
          for (let r = 0; r < rows - 1; r++) {
            const i = r * cols + c;
            const m = i + cols;
            const xc = (px[i] + px[m]) / 2;
            const yc = (py[i] + py[m]) / 2;
            ctx.quadraticCurveTo(px[i], py[i], xc, yc);
            const a = Math.abs(h[i]); if (a > maxH) maxH = a;
          }
          const last = (rows - 1) * cols + c;
          ctx.lineTo(px[last], py[last]);
          const glow = Math.min(0.22, maxH * RIPPLE_GLOW);
          ctx.strokeStyle = `rgba(${L.rgb},${(L.lineAlpha + glow).toFixed(3)})`;
          ctx.stroke();
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
      idleTimer = window.setTimeout(() => { mouse.active = false; }, 160);
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
