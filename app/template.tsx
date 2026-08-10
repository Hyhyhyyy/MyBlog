// template.tsx — App Router route transition (server component).
// Re-mounts on every navigation, so the fade-in plays each time you move
// between sections. This stays a SERVER component and delegates the motion
// to the client RouteFade, so `params` never has to cross the client boundary
// (vinext passes params to templates, and a Promise can't be serialized into a
// client component). Opacity-only on purpose: a transform here would create a
// containing block and break position:fixed UI (reading bar, FAB, mobile dock).

import RouteFade from "./components/route-fade";

export default function Template({ children }: { children: React.ReactNode }) {
  return <RouteFade>{children}</RouteFade>;
}
