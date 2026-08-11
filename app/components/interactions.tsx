"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function PublicUtilities() {
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [focus, setFocus] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("hy-language") === "en" ? "en" : "zh";
    document.documentElement.dataset.language = saved;
    const languageFrame = requestAnimationFrame(() => setLanguage(saved));
    const update = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(languageFrame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  const switchLanguage = () => {
    const next = language === "zh" ? "en" : "zh";
    setLanguage(next);
    localStorage.setItem("hy-language", next);
    document.documentElement.dataset.language = next;
  };

  const switchFocus = () => {
    const next = !focus;
    setFocus(next);
    document.documentElement.classList.toggle("reading-focus", next);
  };

  return <>
    <div className="reading-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
    <aside className="public-utilities" aria-label="浏览工具">
      <button onClick={switchLanguage} aria-label={language === "zh" ? "Switch body text to English" : "将正文切换为中文"}>
        <b>{language === "zh" ? "EN" : "中"}</b><span>{language === "zh" ? "Translate" : "中文正文"}</span>
      </button>
      <button className={focus ? "active" : ""} onClick={switchFocus} aria-pressed={focus} aria-label={focus ? "退出专注阅读" : "进入专注阅读"}>
        <b>◐</b><span>{focus ? "退出专注" : "专注阅读"}</span>
      </button>
    </aside>
  </>;
}

export function QuoteDrawer() {
  const [open, setOpen] = useState(true);
  return (
    <aside className={`quote-drawer ${open ? "open" : "closed"}`}>
      <button className="quote-toggle" aria-label={open ? "收起今日一句批注" : "展开今日一句批注"} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <><span>收起批注</span><b>→</b></> : <><span>今日一句</span><b>←</b></>}
      </button>
      <p className="eyebrow">今日一句 · ORIGINAL NOTE</p>
      <blockquote className="translatable"><span lang="zh">重要的不是答案，<br />而是提出问题的勇气。</span><span lang="en">What matters is not the answer,<br />but the courage to ask.</span></blockquote>
      <small className="translatable"><span lang="zh">私人摘录 · 可随时替换</span><span lang="en">Private excerpt · replaceable anytime</span></small>
    </aside>
  );
}

export function PullBookmark() {
  const [pulled, setPulled] = useState(false);
  return (
    <div className={`bookmark-system ${pulled ? "is-pulled" : ""}`}>
      <button className="pull-bookmark" aria-label={pulled ? "收回书签" : "抽出书签"} aria-expanded={pulled} onClick={() => setPulled(!pulled)}>
        <span>HY</span><small>{pulled ? "RETURN" : "PULL"}</small>
      </button>
      <div className="bookmark-slip" aria-hidden={!pulled}>
        <p>BOOKMARK · 001</p>
        <b>当前章节</b>
        <span>奠基与探索</span>
        <i>继续阅读 →</i>
      </div>
    </div>
  );
}

const archiveTabs = [
  { label: "读书笔记", href: "/collections", code: "READING", note: "小说、戏剧与文学作品留下的阅读痕迹。" },
  { label: "思考片段", href: "/notes", code: "THINKING", note: "尚未长成文章，却值得保留的念头。" },
  { label: "项目日志", href: "/projects", code: "MAKING", note: "从想法、迭代到成果的过程记录。" },
  { label: "随笔集", href: "/notes", code: "WRITING", note: "关于生活、校园与自我成长的文字。" },
];

export function InteractiveIndexTabs() {
  const [active, setActive] = useState<number | null>(null);
  const current = active === null ? null : archiveTabs[active];

  return (
    <div className={`index-tab-system ${active === null ? "" : "has-active"}`}>
      <div className="index-tabs" aria-label="档案分类页签">
        {archiveTabs.map((tab, index) => (
          <button
            className={active === index ? "active" : ""}
            aria-expanded={active === index}
            aria-controls="index-tab-preview"
            onClick={() => setActive(active === index ? null : index)}
            key={tab.label}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <aside id="index-tab-preview" className="index-tab-preview" aria-hidden={!current}>
        {current && <>
          <small>{current.code} · FILE {String(active! + 1).padStart(2, "0")}</small>
          <h3>{current.label}</h3>
          <p>{current.note}</p>
          <Link href={current.href}>翻到这一页 <span>→</span></Link>
        </>}
      </aside>
    </div>
  );
}
