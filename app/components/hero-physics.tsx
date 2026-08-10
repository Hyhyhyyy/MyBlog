"use client";

// hero-physics.tsx — a "大气活泼" full-bleed Matter.js scene for the cover.
// Floating glowing orbs drift, link into a constellation, react to the
// cursor (repel), can be dragged and flung, and burst on click. Matter.js is
// vendored locally at /vendor/matter.min.js (zero CDN). Honors
// prefers-reduced-motion by rendering a calm static arrangement.

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Matter?: any;
  }
}

const PALETTE = ["#b23a2e", "#c8761f", "#e8b04b", "#7a5a28", "#d98a3a"];

function loadMatter(): Promise<any> {
  if (typeof window !== "undefined" && window.Matter) return Promise.resolve(window.Matter);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/vendor/matter.min.js";
    s.onload = () => (window.Matter ? resolve(window.Matter) : reject(new Error("Matter missing")));
    s.onerror = () => reject(new Error("Matter failed to load"));
    document.body.appendChild(s);
  });
}

export default function HeroPhysics({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let cleanup = () => {};

    loadMatter()
      .then((M) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let W = 0, H = 0;

        const resize = () => {
          const r = canvas.getBoundingClientRect();
          W = r.width; H = r.height;
          canvas.width = Math.max(1, W * dpr);
          canvas.height = Math.max(1, H * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();

        const engine = M.Engine.create();
        engine.gravity.y = 0.1;

        const orbs: any[] = [];
        const MAX = 64;

        const makeOrb = (x: number, y: number, r: number, opts: any = {}) => {
          const b = M.Bodies.circle(x, y, r, {
            restitution: 0.92, frictionAir: 0.014, friction: 0, density: 0.001, ...opts,
          });
          b._color = PALETTE[(Math.random() * PALETTE.length) | 0];
          b._r = r;
          M.World.add(engine.world, b);
          orbs.push(b);
          if (orbs.length > MAX) {
            const old = orbs.shift();
            M.World.remove(engine.world, old);
          }
          return b;
        };

        const buildWalls = () => {
          const t = 240;
          const walls = [
            M.Bodies.rectangle(W / 2, -t / 2, W + 2 * t, t, { isStatic: true }),
            M.Bodies.rectangle(W / 2, H + t / 2, W + 2 * t, t, { isStatic: true }),
            M.Bodies.rectangle(-t / 2, H / 2, t, H + 2 * t, { isStatic: true }),
            M.Bodies.rectangle(W + t / 2, H / 2, t, H + 2 * t, { isStatic: true }),
          ];
          M.World.add(engine.world, walls);
          return walls;
        };
        let walls = buildWalls();

        const n = Math.max(8, Math.min(16, Math.round(W / 96)));
        for (let i = 0; i < n; i++) {
          makeOrb(
            Math.random() * W, Math.random() * H * 0.6, 14 + Math.random() * 22,
            { velocity: { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 } },
          );
        }

        if (reduce) {
          // Calm static arrangement: no physics stepping, just draw once.
          const drawStatic = () => {
            ctx.clearRect(0, 0, W, H);
            for (const o of orbs) {
              const x = o.position.x, y = o.position.y, r = o._r;
              const g = ctx.createRadialGradient(x, y, 0, x, y, r);
              g.addColorStop(0, o._color);
              g.addColorStop(1, "rgba(178,58,46,0)");
              ctx.fillStyle = g;
              ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            }
          };
          drawStatic();
          cleanup = () => {};
          return;
        }

        const mouse = M.Mouse.create(canvas);
        mouse.pixelRatio = dpr;
        if (mouse.mousewheel) {
          canvas.removeEventListener("mousewheel", mouse.mousewheel);
          canvas.removeEventListener("DOMMouseScroll", mouse.mousewheel);
        }
        const mc = M.MouseConstraint.create(engine, {
          mouse, constraint: { stiffness: 0.18, render: { visible: false } },
        });
        M.World.add(engine.world, mc);

        let downPos: { x: number; y: number } | null = null;
        const onDown = (e: MouseEvent) => {
          const r = canvas.getBoundingClientRect();
          downPos = { x: e.clientX - r.left, y: e.clientY - r.top };
        };
        const onClick = (e: MouseEvent) => {
          if (!downPos) return;
          const r = canvas.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          if (Math.hypot(x - downPos.x, y - downPos.y) > 8) return;
          for (let i = 0; i < 8; i++) {
            makeOrb(x, y, 5 + Math.random() * 7, {
              velocity: { x: (Math.random() - 0.5) * 9, y: (Math.random() - 0.5) * 9 },
            });
          }
        };
        canvas.addEventListener("mousedown", onDown);
        canvas.addEventListener("click", onClick);

        const repel = () => {
          const m = mouse.position;
          if (!m) return;
          const R = 150;
          for (const o of orbs) {
            const dx = o.position.x - m.x, dy = o.position.y - m.y;
            const d = Math.hypot(dx, dy);
            if (d > 0 && d < R) {
              const f = (1 - d / R) * 0.0008 * o._r;
              M.Body.applyForce(o, o.position, { x: (dx / d) * f, y: (dy / d) * f });
            }
          }
        };

        const onResize = () => {
          resize();
          M.World.remove(engine.world, walls);
          walls = buildWalls();
          mouse.pixelRatio = dpr;
        };
        window.addEventListener("resize", onResize);

        const LINK = 165;
        const draw = () => {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "rgba(250,246,236,0.22)";
          ctx.fillRect(0, 0, W, H);
          ctx.lineWidth = 1;
          for (let i = 0; i < orbs.length; i++) {
            for (let j = i + 1; j < orbs.length; j++) {
              const a = orbs[i].position, b = orbs[j].position;
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (d < LINK) {
                ctx.strokeStyle = `rgba(178,58,46,${((1 - d / LINK) * 0.22).toFixed(3)})`;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
              }
            }
          }
          ctx.globalCompositeOperation = "lighter";
          for (const o of orbs) {
            const x = o.position.x, y = o.position.y, r = o._r;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, o._color);
            g.addColorStop(1, "rgba(178,58,46,0)");
            ctx.shadowBlur = 20; ctx.shadowColor = o._color;
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.globalCompositeOperation = "source-over";
        };

        let last = performance.now();
        const loop = (now: number) => {
          const dt = Math.min(33, now - last); last = now;
          repel();
          M.Engine.update(engine, dt);
          draw();
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", onResize);
          canvas.removeEventListener("mousedown", onDown);
          canvas.removeEventListener("click", onClick);
          M.World.clear(engine.world, false);
          M.Engine.clear(engine);
        };
      })
      .catch((err) => console.error("[hero-physics] Matter load failed:", err));

    return () => cleanup();
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
