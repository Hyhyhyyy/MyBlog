import type { Metadata } from "next";
import { PwaRuntime } from "./components/pwa-runtime";
import "./globals.css";
import "./motion.css";

export const metadata: Metadata = {
  title: "Hyhyhyyy · Growth Archive",
  description: "把走过的路，编成可翻阅的页。",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "HYHY 工作台", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}<PwaRuntime /></body>
    </html>
  );
}
