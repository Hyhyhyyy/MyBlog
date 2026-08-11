import type { Metadata } from "next";
import { PwaRuntime } from "./components/pwa-runtime";
import HeroPhysics from "./components/hero-physics";
import "./globals.css";
import "./motion.css";
import "./blog.css";

export const metadata: Metadata = {
  title: "Hyhyhyyy · Growth Archive",
  description: "把走过的路，编成可翻阅的页。",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "HYHY 成长档案", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <HeroPhysics className="site-physics" />
        {children}
        <PwaRuntime />
      </body>
    </html>
  );
}
