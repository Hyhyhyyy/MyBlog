"use client";

// route-fade.tsx — client half of the App Router page transition.
// Kept separate from app/template.tsx (a server component) so that `params`
// never has to cross the server→client boundary; only `children` does.

import { motion, useReducedMotion } from "framer-motion";

export default function RouteFade({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
