"use client";

// hero-physics.tsx — "大气活泼" layered flowing-grid background with
// mouse-interactive ripples. Replaces the old gravity-orb (Matter.js) scene.
//
// A real (if lightweight) per-node physics engine runs here: every grid node
// is a spring anchored to a slowly drifting "home" position (the flow), is
// pushed away by the cursor (the ripple), and is damped each frame. Three
// stacked layers at different spacing / opacity / reactivity give the
// background a sense of depth (层次感). Honors prefers-reduced-motion: the
// CSS hides the canvas, so we only render one calm frame and skip the loop.

import { useEffect, useRef } from "react";

type GridNode = {
  bx: number; by: number; // base grid home (drift centre)
  hx: number; hy: number; // drifting home (spring target)
  x: number; y: number;   // current position
  vx: number; vy: number; // velocity
  phase: number;          // per-node drift offset
};

type Layer = {
  nodes: GridNode[];
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

// Far → near. Near layer is tight, bright and highly reactive (reads as front);
// far layer is sparse, hazy and barely reactive (reads as depth behind).
const LAYER_DEFS = [
  { spacing: 88, flowAmp: 11, flowSpeed: 0.00055, reactive: 0.35, lineAlpha: 0.05, dotR: 0.9, rgb: "214,184,140", dotAlpha: 0.20 },
  { spacing: 60, flowAmp: 8,  flowSpeed: 0.00085, reactive: 0.65, lineAlpha: 0.085, dotR: 1.3, rgb: "200,118,31", dotAlpha: 0.34 },
  { spacing: 42, flowAmp: 5,  flowSpeed: 0.00125, reactive: 1.0,  lineAlpha: 0.14, dotR: 1.9, rgb: "214,58,46", dotAlpha: 0.55 },
];

const R = 160;     // cursor influence radius (css px)
const PUSH = 1.1;  // cursor repulsion strength
const K = 0.055;   // spring stiffness (pull back to home)
const DAMP = 0.87; // per-frame velocity damping

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

      // fewer nodes on small / high-density screens for performance.
      const scale = W < 720 ? 1.55 : W < 1100 ? 1.18 : 1;
      layers = LAYER_DEFS.map((def) => {
        const spacing = def.spacing * scale;
        const cols = Math.ceil(W / spacing) + 2;
        const rows = Math.ceil(H / spacing) + 2;
        const ox = (W - (cols - 1) * spacing) / 2;
        const oy = (H - (rows - 1) * spacing) / 2;
        const nodes: GridNode[] = [];
        for (let rr = 0; rr < rows; rr++) {
          for (let c = 0; c < cols; c++) {
            const bx = ox + c * spacing;
            const by = oy + rr * spacing;
            nodes.push({ bx, by, hx: bx, hy: by, x: bx, y: by, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 });
          }
        }
        return { ...def, nodes, cols, rows, spacing };
      });
    };

    const stepAndDraw = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      for (const L of layers) {
        const { cols, rows } = L;

        // --- physics: drift + spring + cursor repulsion + damping ---
        for (const n of L.nodes) {
          const hx = n.bx + Math.sin(t * L.flowSpeed + n.phase) * L.flowAmp;
          const hy = n.by + Math.cos(t * L.flowSpeed * 0.9 + n.phase * 1.3) * L.flowAmp * 0.6;
          n.hx = hx; n.hy = hy;

          let ax = (hx - n.x) * K;
          let ay = (hy - n.y) * K;

          if (mouse.active) {
            const dx = n.x - mouse.x, dy = n.y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < R * R) {
              const d = Math.sqrt(d2) || 1;
              const f = (1 - d / R) * PUSH * L.reactive;
              ax += (dx / d) * f;
              ay += (dy / d) * f;
            }
          }

          n.vx = (n.vx + ax) * DAMP;
          n.vy = (n.vy + ay) * DAMP;
          n.x += n.vx;
          n.y += n.vy;
        }

        // --- grid lines (warped by node displacement → ripple) ---
        ctx.lineWidth = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const n = L.nodes[i];
            const disp = Math.hypot(n.x - n.hx, n.y - n.hy);
            const glow = Math.min(0.18, disp * 0.004);
            if (c < cols - 1) {
              const m = L.nodes[i + 1];
              ctx.strokeStyle = `rgba(${L.rgb},${(L.lineAlpha + glow).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
            }
            if (r < rows - 1) {
              const m = L.nodes[i + cols];
              ctx.strokeStyle = `rgba(${L.rgb},${(L.lineAlpha + glow).toFixed(3)})`;
              ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
            }
          }
        }

        // --- node dots (brighter where disturbed) ---
        for (const n of L.nodes) {
          const disp = Math.hypot(n.x - n.hx, n.y - n.hy);
          const glow = Math.min(0.3, disp * 0.006);
          ctx.fillStyle = `rgba(${L.rgb},${(L.dotAlpha + glow).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(n.x, n.y, L.dotR, 0, Math.PI * 2); ctx.fill();
        }
      }

      // --- faint glowing core that follows the cursor (ripple centre) ---
      if (mouse.active) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R);
        g.addColorStop(0, "rgba(232,176,75,0.10)");
        g.addColorStop(1, "rgba(232,176,75,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, R, 0, Math.PI * 2); ctx.fill();
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
      // CSS hides .hero-physics under reduced motion; draw one calm frame.
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
