import Link from "next/link";
import { PublicShell } from "../../components/public-shell";

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "growth-archive") return null;
  return <PublicShell active="projects"><main className="public-page project-detail">
    <Link className="back-link" href="/projects">← 返回项目</Link>
    <header><p className="eyebrow">PROJECT FILE · 001 / IN PROGRESS</p><h1>Hyhyhyyy<br />Growth Archive</h1><p>个人成长记录、考研规划、技术项目与公开表达的一体化系统。</p></header>
    <section className="project-meta"><div><small>ROLE</small><b>产品构想与个人使用者</b></div><div><small>STATUS</small><b>UI 设计阶段</b></div><div><small>STACK</small><b>TypeScript · PWA · AI</b></div><div><small>VISIBILITY</small><b>Private preview</b></div></section>
    <section className="project-story"><aside><p>ACT I</p><b>从问题开始</b><span>SCENE 01</span></aside><div><h2>为什么需要它？</h2><p>长期目标容易与每天的行动断开，学生工作、项目材料、知识笔记和阶段成果又散落在不同工具中。这个系统尝试让记录只发生一次，之后由 AI 帮助整理为计划、时间线、项目日志和可公开成果。</p><blockquote>记录不是终点，它应该反过来帮助下一步行动。</blockquote></div></section>
    <section className="project-scenes">{["需求与提问", "信息架构", "视觉系统", "交互原型", "数据与 AI"].map((x, i) => <article className={i < 3 ? "done" : ""} key={x}><span>{String(i + 1).padStart(2, "0")}</span><h3>{x}</h3><p>{i < 3 ? "本阶段已形成可确认成果" : "将在下一阶段继续完成"}</p></article>)}</section>
  </main></PublicShell>;
}
