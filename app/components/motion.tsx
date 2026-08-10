"use client";

// motion.tsx — reusable animation primitives for the Growth Archive.
// Built on Framer Motion (zero extra runtime beyond the dep) plus a few
// reactbits.dev-style interactions (magnetic button, spotlight, tilt card,
// text-generate). Designed for a "大气活泼" (grand & lively) feel while
// staying calm under prefers-reduced-motion.

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  animate,
  AnimatePresence,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";

// ---------------------------------------------------------------------------
// Scroll reveal — fades + lifts content into view once.
// ---------------------------------------------------------------------------
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "header";
}) {
  const reduce = useReducedMotion();
  const MotionTag: any = motion[as];
  return (
    <MotionTag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.7, 0.2, 1] }}
    >
      {children}
    </MotionTag>
  );
}

// ---------------------------------------------------------------------------
// Stagger container + item — choreographed entrance for lists/cards.
// ---------------------------------------------------------------------------
export function Stagger({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0.05,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}) {
  const reduce = useReducedMotion();
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren } },
  };
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  const item: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.7, 0.2, 1] } },
  };
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Text generate — characters stagger in (reactbits TextGenerateEffect).
// ---------------------------------------------------------------------------
export function TextGenerate({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  const chars = [...text];
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.022, delayChildren: delay } },
      }}
      aria-label={text}
    >
      {chars.map((c, i) => (
        <motion.span
          key={i}
          aria-hidden
          style={{ display: "inline-block", whiteSpace: "pre" }}
          variants={{
            hidden: { opacity: 0, y: "0.5em" },
            visible: { opacity: 1, y: "0em", transition: { duration: 0.5, ease: [0.22, 0.7, 0.2, 1] } },
          }}
        >
          {c}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Magnetic — element follows the cursor with a springy pull (reactbits).
// ---------------------------------------------------------------------------
export function Magnetic({
  children,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 14, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 14, mass: 0.4 });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy, display: "inline-block" }}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Spotlight — a cursor-following radial glow inside the wrapped area.
// ---------------------------------------------------------------------------
export function Spotlight({
  children,
  className,
  color = "rgba(200,118,31,0.16)",
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const reduce = useReducedMotion();
  return (
    <div
      ref={ref}
      className={`spotlight ${className ?? ""}`}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onMouseLeave={() => {
        mx.set(-200);
        my.set(-200);
      }}
      style={{ position: "relative", overflow: "hidden" }}
    >
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          left: mx,
          top: my,
          width: 380,
          height: 380,
          x: "-50%",
          y: "-50%",
          borderRadius: "50%",
          pointerEvents: "none",
          background: `radial-gradient(circle, ${color}, transparent 70%)`,
          filter: "blur(8px)",
        }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TiltCard — 3D tilt on hover (reactbits TiltedCard, lightweight).
// ---------------------------------------------------------------------------
export function TiltCard({
  children,
  className,
  max = 9,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(0, { stiffness: 200, damping: 16 });
  const ry = useSpring(0, { stiffness: 200, damping: 16 });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * max);
        rx.set(-py * max);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ScrollProgress — a top reading-progress bar driven by page scroll.
// ---------------------------------------------------------------------------
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const w = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        transformOrigin: "0%",
        scaleX: w,
        zIndex: 80,
        background: "linear-gradient(90deg,#b23a2e,#c8761f)",
        boxShadow: "0 0 10px rgba(178,58,46,0.4)",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// AnimatedNumber — count-up that springs from 0 to `value` on mount.
// Grand, lively touch for stat bands; shows the final value instantly under
// prefers-reduced-motion.
// ---------------------------------------------------------------------------
export function AnimatedNumber({
  value,
  duration = 1.1,
  className,
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 0.7, 0.2, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [value, duration, reduce, mv]);

  const text = `${prefix}${Math.round(display)}${suffix}`;
  return <span className={className}>{text}</span>;
}

export { AnimatePresence, useScroll, useTransform, type CSSProperties, type HTMLMotionProps };
