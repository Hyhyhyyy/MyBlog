import Link from "next/link";
import { studioNav } from "../content";
import { MobileDock, QuickCapture } from "./interactions";

export function StudioShell({ children, active = "" }: { children: React.ReactNode; active?: string }) {
  return <div className="studio-app">
    <aside className="studio-sidebar">
      <Link className="brand" href="/"><b>HYHY</b><span>/</span><em>Private Studio</em></Link>
      <div className="profile-chip"><span>HY</span><div><b>Hyhyhyyy</b><small>管理员 · 私密空间</small></div></div>
      <nav>{studioNav.map(([label, labelEn, href, no]) => <Link href={href} className={active === href.split("/").pop() ? "active" : ""} key={href}><small>{no}</small><span>{label}<em>{labelEn}</em></span></Link>)}</nav>
      <div className="sidebar-note"><p>ACT I · SCENE 01</p><b>奠基与探索</b><span>下一次阶段复盘：待规划</span></div>
      <Link className="back-public" href="/">← 返回公开主页</Link>
    </aside>
    <main className="studio-main">{children}</main>
    <QuickCapture />
    <MobileDock active={active} />
  </div>;
}

export function StudioHeading({ kicker, title, intro, action }: { kicker: string; title: string; intro: string; action?: string }) {
  const translations: Record<string, string> = {
    "今天，从建立基线开始。": "Today, Begin with a Baseline.",
    "目标不是口号，而是可以验证的章节。": "Goals Are Chapters We Can Verify.",
    "学习进度": "Learning Progress",
    "成长收件箱": "Growth Inbox",
    "项目管理": "Project Studio",
    "经历与成果": "Experience & Achievements",
    "AI 复盘助手": "AI Review Assistant",
    "设置": "Settings",
    "使用指南": "Guide & Trial Manual",
  };
  return <header className="studio-heading"><div><p className="eyebrow">{kicker}</p><h1 className="studio-bilingual-title"><span>{title}</span><small>{translations[title] ?? title}</small></h1><p>{intro}</p></div>{action && <button className="ink-button">{action} <span>＋</span></button>}</header>;
}
