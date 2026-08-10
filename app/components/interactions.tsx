"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function PublicUtilities({ isAdmin }: { isAdmin: boolean }) {
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
      {isAdmin && <Link className="floating-studio-entry" href="/studio"><b>HY</b><span>私人工作台<br /><small>ADMIN STUDIO</small></span></Link>}
    </aside>
  </>;
}

export function MobileDock({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const main = [["today", "今日", "◷"], ["goals", "目标", "◎"], ["inbox", "记录", "＋"], ["archive", "材料", "⌁"]] as const;
  const all = [
    ["today", "今日计划"], ["goals", "目标与计划"], ["study", "学习进度"],
    ["inbox", "成长收件箱"], ["projects", "项目管理"], ["archive", "经历与材料"],
    ["review", "复盘助手"], ["settings", "设置"], ["guide", "使用指南"],
  ] as const;
  return <>
    <nav className="mobile-dock" aria-label="手机工作台导航">
      {main.map(([slug, label, icon]) => <Link className={active === slug ? "active" : ""} href={`/studio/${slug}`} key={slug}><b>{icon}</b><span>{label}</span></Link>)}
      <button className={open ? "active" : ""} aria-expanded={open} onClick={() => setOpen(!open)}><b>☰</b><span>全部</span></button>
    </nav>
    {open && <div className="mobile-menu-backdrop" onClick={() => setOpen(false)}>
      <section className="mobile-menu-sheet" onClick={(event) => event.stopPropagation()}>
        <div><p className="eyebrow">PRIVATE STUDIO · ALL SECTIONS</p><button aria-label="关闭菜单" onClick={() => setOpen(false)}>×</button></div>
        <h2>工作台全部功能</h2>
        <nav>{all.map(([slug, label], index) => <Link className={active === slug ? "active" : ""} href={`/studio/${slug}`} onClick={() => setOpen(false)} key={slug}><small>{String(index + 1).padStart(2, "0")}</small><span>{label}</span><b>→</b></Link>)}</nav>
      </section>
    </div>}
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
      <small className="translatable"><span lang="zh">私人摘录 · 可在工作台替换</span><span lang="en">Private excerpt · editable in Studio</span></small>
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
            <span>{tab.label}</span><small>{String(index + 1).padStart(2, "0")}</small>
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

export function TimelineScrubber() {
  const scenes = [
    ["序章", "从北京海淀出发，保留好奇与表达欲。"],
    ["校园", "进入大连理工大学计算机类，开始新的探索。"],
    ["参与", "在学生组织、飞盘与音乐剧中认识协作。"],
    ["创造", "用项目把学习转化为可以验证的作品。"],
    ["未完", "下一章仍在书写。"],
  ];
  const [index, setIndex] = useState(2);
  return (
    <div className="scrubber">
      <div className="scene-preview"><span>SCENE {String(index + 1).padStart(2, "0")}</span><h3>{scenes[index][0]}</h3><p>{scenes[index][1]}</p></div>
      <input aria-label="成长章节预览" type="range" min="0" max="4" value={index} onChange={(e) => setIndex(Number(e.target.value))} />
      <div className="scrubber-labels">{scenes.map((scene, i) => <button className={i === index ? "active" : ""} onClick={() => setIndex(i)} key={scene[0]}>{String(i + 1).padStart(2, "0")}</button>)}</div>
    </div>
  );
}

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("随手记");
  const [content, setContent] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => {
    const frame = requestAnimationFrame(() => setContent(localStorage.getItem("hy-quick-draft") ?? ""));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (content) localStorage.setItem("hy-quick-draft", content);
    else localStorage.removeItem("hy-quick-draft");
  }, [content]);
  const save = async () => {
    if (!content.trim()) return;
    setState("saving");
    try {
      const response = await fetch("/api/captures", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: type, content }),
      });
      if (!response.ok) throw new Error();
      setState("saved");
      setContent("");
      setTimeout(() => { setOpen(false); setState("idle"); }, 650);
    } catch {
      setState("error");
    }
  };
  return <>
    <button className="capture-fab" onClick={() => setOpen(true)}><span>＋</span> 快速记录</button>
    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <section className="capture-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setOpen(false)}>×</button>
        <p className="eyebrow">GROWTH INBOX</p><h2>此刻想记下什么？</h2>
        <div className="capture-types">{["随手记", "学习", "项目", "经历", "成果"].map((item) => <button onClick={() => setType(item)} className={type === item ? "active" : ""} key={item}>{item}</button>)}</div>
        <textarea autoFocus value={content} onChange={(event) => setContent(event.target.value)} placeholder={`用一句话记录${type}，AI 会帮你整理时间、分类和关联目标……`} />
        <div className="capture-actions"><VoiceRecorder compact onSaved={() => { setState("saved"); setTimeout(() => { setOpen(false); setState("idle"); }, 700); }} /><Link href="/studio/archive">⌁ 材料</Link><button className="primary" disabled={state === "saving" || !content.trim()} onClick={save}>{state === "saving" ? "正在同步…" : state === "saved" ? "已存入收件箱 ✓" : "保存原始记录 →"}</button></div>
        {state === "error" && <p className="sync-error">同步失败，请检查网络后重试；内容仍保留在输入框中。</p>}
      </section>
    </div>}
  </>;
}

export function VoiceRecorder({ compact = false, onSaved }: { compact?: boolean; onSaved?: () => void }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const [state, setState] = useState<"idle" | "recording" | "uploading" | "saved" | "error">("idle");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [state]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorder.current = mediaRecorder;
      chunks.current = [];
      startedAt.current = Date.now();
      setSeconds(0);
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const duration = (Date.now() - startedAt.current) / 1000;
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
        const form = new FormData();
        form.append("audio", blob, `voice.${extension}`);
        form.append("duration", String(duration));
        setState("uploading");
        try {
          const response = await fetch("/api/voice", { method: "POST", body: form });
          if (!response.ok) throw new Error();
          setState("saved");
          onSaved?.();
          setTimeout(() => setState("idle"), 1400);
        } catch { setState("error"); }
      };
      mediaRecorder.start(1000);
      setState("recording");
    } catch { setState("error"); }
  };

  const stop = () => recorder.current?.state === "recording" && recorder.current.stop();
  if (compact) return <button type="button" className={`voice-button ${state}`} onClick={state === "recording" ? stop : start} disabled={state === "uploading"}>
    {state === "recording" ? `■ 停止 ${seconds}s` : state === "uploading" ? "上传录音…" : state === "saved" ? "已保存 ✓" : state === "error" ? "录音失败，重试" : "🎙 语音"}
  </button>;
  return <section className={`voice-recorder ${state}`}>
    <div className="voice-disc"><i /><span>{state === "recording" ? seconds : "REC"}</span></div>
    <div><p className="eyebrow">VOICE CAPTURE · ORIGINAL AUDIO</p><h3>{state === "recording" ? "正在录音" : state === "uploading" ? "正在加密上传" : state === "saved" ? "录音已进入收件箱" : "用声音快速记录"}</h3><small>{state === "error" ? "请允许麦克风权限并确认网络连接。" : "原音频永久保留；fun-asr 接口启用后自动生成转写草稿。"}</small></div>
    <button onClick={state === "recording" ? stop : start} disabled={state === "uploading"}>{state === "recording" ? "停止并保存" : state === "uploading" ? "上传中…" : "开始录音"}</button>
  </section>;
}

const BURST_COLORS = ["#d8583d", "#c8761f", "#e8b04b", "#13253a", "#a9ada3"];

// Burst — a small celebratory particle pop when a task is completed.
// Containment-safe: absolutely positioned inside the task row, auto-removed.
function Burst({ seed }: { seed: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const parts = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2 + (seed % 7) * 0.3;
    const dist = 24 + ((seed + i) % 5) * 7;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      color: BURST_COLORS[i % BURST_COLORS.length],
    };
  });
  return (
    <span className="task-burst" aria-hidden="true">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          style={{ background: p.color }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.2 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

export function TodayChecklist() {
  type Task = { id: number; title: string; durationMinutes: number; completed: boolean };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sync, setSync] = useState<"loading" | "synced" | "saving" | "error">("loading");
  const [newTitle, setNewTitle] = useState("");
  const [bursts, setBursts] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch("/api/tasks").then(async (response) => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then((data) => { setTasks(data.tasks); setSync("synced"); }).catch(() => setSync("error"));
  }, []);

  const toggle = async (task: Task) => {
    const completed = !task.completed;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed } : item));
    if (completed) {
      const seed = Date.now() + task.id;
      setBursts((current) => ({ ...current, [task.id]: seed }));
      window.setTimeout(() => {
        setBursts((current) => {
          const next = { ...current };
          delete next[task.id];
          return next;
        });
      }, 750);
    }
    setSync("saving");
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: task.id, completed }),
      });
      if (!response.ok) throw new Error();
      setSync("synced");
    } catch {
      setTasks((current) => current.map((item) => item.id === task.id ? task : item));
      setSync("error");
    }
  };

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setSync("saving");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: newTitle, durationMinutes: 25 }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTasks((current) => [...current, data.task]);
      setNewTitle("");
      setSync("synced");
    } catch { setSync("error"); }
  };

  const removeTask = async (task: Task) => {
    setSync("saving");
    try {
      const response = await fetch(`/api/tasks?id=${task.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setSync("synced");
    } catch { setSync("error"); }
  };

  return <div className="checklist">
    <div className={`sync-indicator ${sync}`}><i />{sync === "loading" ? "正在读取云端计划" : sync === "saving" ? "正在同步" : sync === "synced" ? "已跨设备同步" : "同步暂时失败"}</div>
    {tasks.map((task) => <label className={task.completed ? "done" : ""} key={task.id}><input type="checkbox" checked={task.completed} onChange={() => toggle(task)} /><span>{task.title}{bursts[task.id] !== undefined && <Burst key={bursts[task.id]} seed={bursts[task.id]} />}</span><em>{task.durationMinutes} min</em><button className="row-delete" aria-label={`删除${task.title}`} onClick={(event) => { event.preventDefault(); removeTask(task); }}>×</button></label>)}
    <div className="task-add"><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTask(); }} placeholder="添加一项今日任务…" /><button onClick={addTask} disabled={!newTitle.trim()}>加入计划</button></div>
    {sync === "error" && tasks.length === 0 && <div className="sync-empty">暂时无法读取计划，请刷新重试。</div>}
  </div>;
}

type Capture = { id: number; kind: string; content: string; status: string; createdAt: string };

export function InboxManager() {
  const [items, setItems] = useState<Capture[]>([]);
  const [filter, setFilter] = useState("all");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState("随手记");
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");

  useEffect(() => {
    fetch("/api/captures").then(async (response) => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then((data) => { setItems(data.captures); setState("ready"); }).catch(() => setState("error"));
  }, []);

  const create = async () => {
    if (!content.trim()) return;
    setState("saving");
    try {
      const response = await fetch("/api/captures", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, content }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems((current) => [data.capture, ...current]);
      setContent("");
      setState("ready");
    } catch { setState("error"); }
  };

  const updateStatus = async (item: Capture, status: string) => {
    setState("saving");
    try {
      const response = await fetch("/api/captures", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, status }),
      });
      if (!response.ok) throw new Error();
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
      setState("ready");
    } catch { setState("error"); }
  };

  const remove = async (item: Capture) => {
    setState("saving");
    try {
      const response = await fetch(`/api/captures?id=${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setItems((current) => current.filter((row) => row.id !== item.id));
      setState("ready");
    } catch { setState("error"); }
  };

  const visible = filter === "all" ? items : items.filter((item) => item.status === filter);
  const count = (status: string) => status === "all" ? items.length : items.filter((item) => item.status === status).length;

  return <>
    <section className="inbox-composer">
      <div className="composer-head"><p className="eyebrow">QUICK CAPTURE · MANUAL FIRST</p><span className={`sync-indicator ${state === "saving" ? "saving" : state === "error" ? "error" : "synced"}`}><i />{state === "saving" ? "正在同步" : state === "error" ? "同步失败" : "云端已保存"}</span></div>
      <div className="capture-kind-row">{["随手记", "学习", "项目", "经历", "成果"].map((name) => <button className={kind === name ? "active" : ""} onClick={() => setKind(name)} key={name}>{name}</button>)}</div>
      <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="先忠实记录原始事实；未来可交由 AI 整理，但现在也能手动归档。" />
      <VoiceRecorder onSaved={() => window.location.reload()} />
      <div><Link href="/studio/archive">⌁ 上传或关联材料</Link><button className="primary" disabled={!content.trim() || state === "saving"} onClick={create}>保存原始记录 →</button></div>
    </section>
    <section className="inbox-layout"><aside>
      {[["all", "全部"], ["inbox", "待整理"], ["confirmed", "已确认"], ["archived", "已归档"]].map(([value, label]) => <button className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}　{count(value)}</button>)}
    </aside><div className="inbox-items">
      {state === "loading" && <div className="clean-empty"><b>正在翻阅收件箱…</b></div>}
      {state !== "loading" && visible.length === 0 && <div className="clean-empty"><b>这一栏还是空白</b><p>新的记录会安全地保存在这里。</p></div>}
      {visible.map((item) => <article key={item.id}><span className="file-icon">{item.kind.slice(0, 1)}</span><div><p className="eyebrow">{item.kind.toUpperCase()} · {item.status === "inbox" ? "NEEDS REVIEW" : item.status.toUpperCase()}</p><h3>{item.content}</h3><p>{new Date(item.createdAt).toLocaleString("zh-CN")}</p><div className="paper-tags"><span>默认私密</span><span>{item.status === "archived" ? "已归档" : "原始记录已保留"}</span></div></div><div className="item-actions">{item.status !== "confirmed" && <button onClick={() => updateStatus(item, "confirmed")}>确认</button>}{item.status !== "archived" && <button onClick={() => updateStatus(item, "archived")}>归档</button>}<button className="danger" onClick={() => remove(item)}>删除</button></div></article>)}
    </div></section>
  </>;
}

type Asset = { id: number; fileName: string; contentType: string; size: number; createdAt: string };

export function EvidenceManager() {
  const [items, setItems] = useState<Asset[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const load = () => fetch("/api/assets").then(async (response) => {
    if (!response.ok) throw new Error();
    return response.json();
  }).then((data) => { setItems(data.assets); setState("ready"); }).catch(() => setState("error"));
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setState("saving");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/assets", { method: "POST", body: form });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems((current) => [data.asset, ...current]);
      setState("ready");
    } catch { setState("error"); }
  };
  const remove = async (asset: Asset) => {
    setState("saving");
    try {
      const response = await fetch(`/api/assets?id=${asset.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setItems((current) => current.filter((item) => item.id !== asset.id));
      setState("ready");
    } catch { setState("error"); }
  };

  return <section className="evidence-manager">
    <label className="evidence-drop"><span>⌁</span><div><h3>上传证书、活动照片或项目文件</h3><p>原文件进入私人材料库，单个文件不超过 20MB。</p></div><b>{state === "saving" ? "上传中…" : "选择材料"}</b><input type="file" disabled={state === "saving"} onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.currentTarget.value = ""; }} /></label>
    {state === "error" && <p className="sync-error">材料库操作失败，请稍后重试。</p>}
    <div className="asset-list">{items.map((asset) => <article key={asset.id}><span>{asset.contentType.startsWith("image/") ? "IMG" : "FILE"}</span><div><b>{asset.fileName}</b><small>{(asset.size / 1024).toFixed(1)} KB · {new Date(asset.createdAt).toLocaleDateString("zh-CN")}</small></div><a href={`/api/assets/${asset.id}`}>下载</a><button onClick={() => remove(asset)}>删除</button></article>)}</div>
  </section>;
}

export function AiIntegrationStatus() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [status, setStatus] = useState<{
    configured: boolean;
    provider: string | null;
    jobs: { waiting: number; processing: number; completed: number; failed: number; blocked: number };
  } | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        setStatus(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") {
    return <div className="ai-integration-status"><span className="status waiting">CHECKING…</span><div><b>正在读取 AI 接口状态</b><small>连接后端中。</small></div></div>;
  }
  if (state === "error" || !status) {
    return <div className="ai-integration-status"><span className="status waiting">INTERFACE READY</span><div><b>AI 尚未启用</b><small>已预留百炼兼容接口。当前全部核心数据可手动管理。</small></div></div>;
  }

  const { configured, provider, jobs } = status;
  const total = jobs.waiting + jobs.processing + jobs.completed + jobs.failed + jobs.blocked;
  return (
    <div className="ai-integration-status">
      <span className={configured ? "status active" : "status waiting"}>
        {configured ? "PROVIDER CONNECTED" : "INTERFACE READY"}
      </span>
      <div>
        <b>{configured ? `AI 已连接 · ${provider ?? "aliyun-bailian"}` : "AI 尚未启用"}</b>
        <small>
          {configured
            ? `已完成 ${jobs.completed} 个任务，待处理 ${jobs.waiting + jobs.processing} 个。`
            : `已预留百炼兼容接口：qwen3.7-plus / max / flash / omni。配置 AI_API_KEY 后启用（当前 ${total} 个任务，未配置显示为 blocked）。`}
        </small>
      </div>
    </div>
  );
}

type GrowthRecord = {
  id: number; category: string; title: string; description: string; status: string;
  visibility: string; startedAt?: string | null; endedAt?: string | null; updatedAt: string;
};

export function RecordManager({ category, title, empty }: { category: string; title: string; empty: string }) {
  const [items, setItems] = useState<GrowthRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GrowthRecord | null>(null);
  const [form, setForm] = useState({ title: "", description: "", startedAt: "", endedAt: "" });
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  useEffect(() => {
    fetch(`/api/records?category=${category}`).then(async (response) => {
      if (!response.ok) throw new Error(); return response.json();
    }).then((data) => { setItems(data.records); setState("ready"); }).catch(() => setState("error"));
  }, [category]);
  const begin = (item?: GrowthRecord) => {
    setEditing(item ?? null);
    setForm(item ? { title: item.title, description: item.description, startedAt: item.startedAt ?? "", endedAt: item.endedAt ?? "" } : { title: "", description: "", startedAt: "", endedAt: "" });
    setOpen(true);
  };
  const save = async () => {
    if (!form.title.trim()) return;
    setState("saving");
    try {
      const response = await fetch("/api/records", {
        method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(editing ? { id: editing.id } : { category }), ...form }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems((current) => editing ? current.map((item) => item.id === editing.id ? data.record : item) : [data.record, ...current]);
      setOpen(false); setEditing(null); setState("ready");
    } catch { setState("error"); }
  };
  const changeStatus = async (item: GrowthRecord, status: string) => {
    const response = await fetch("/api/records", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, status }) });
    if (response.ok) setItems((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
  };
  const remove = async (item: GrowthRecord) => {
    const response = await fetch(`/api/records?id=${item.id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((row) => row.id !== item.id));
  };
  return <section className="record-manager studio-card">
    <div className="card-title"><div><p className="eyebrow">MANUAL ARCHIVE · CLOUD SYNC</p><h2>{title}</h2></div><button onClick={() => begin()}>新增 ＋</button></div>
    {state === "loading" && <div className="clean-empty"><b>正在同步档案…</b></div>}
    {state !== "loading" && items.length === 0 && <div className="clean-empty"><b>{empty}</b><p>点击“新增”建立第一条可长期保存的记录。</p></div>}
    <div className="record-list">{items.map((item) => <article key={item.id}><div><span className={`status ${item.status}`}>{item.status.toUpperCase()}</span><small>{item.visibility === "private" ? "PRIVATE" : "PUBLIC"}</small></div><h3>{item.title}</h3><p>{item.description || "尚未补充说明"}</p><time>{item.startedAt || "时间待补充"}{item.endedAt ? ` — ${item.endedAt}` : ""}</time><footer><button onClick={() => begin(item)}>编辑</button><button onClick={() => changeStatus(item, item.status === "completed" ? "active" : "completed")}>{item.status === "completed" ? "恢复进行" : "标记完成"}</button><button className="danger" onClick={() => remove(item)}>删除</button></footer></article>)}</div>
    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><section className="record-editor" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setOpen(false)}>×</button><p className="eyebrow">PRIVATE RECORD</p><h2>{editing ? "编辑记录" : "新增记录"}</h2><label>标题<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>说明<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div><label>开始日期<input type="date" value={form.startedAt} onChange={(event) => setForm({ ...form, startedAt: event.target.value })} /></label><label>结束日期<input type="date" value={form.endedAt} onChange={(event) => setForm({ ...form, endedAt: event.target.value })} /></label></div><button className="primary" disabled={!form.title.trim() || state === "saving"} onClick={save}>{state === "saving" ? "保存中…" : "保存记录"}</button></section></div>}
  </section>;
}

export function FocusTimer() {
  const [seconds, setSeconds] = useState(45 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return <article className="studio-card focus-card"><p className="eyebrow">FOCUS TIMER</p><span className="focus-time">{minutes}:{rest}</span><small>{running ? "FOCUSING" : "READY"}</small><h3>408 数据结构基线测试</h3><button onClick={() => seconds === 0 ? (setSeconds(45 * 60), setRunning(true)) : setRunning(!running)}>{seconds === 0 ? "重新开始" : running ? "暂停" : "开始专注"} →</button></article>;
}

export function AiCoach() {
  return <div className="ai-coach">
    <div className="coach-head"><span className="seal">AI</span><div><p className="eyebrow">SUPERVISION INTERFACE</p><h3>监督接口已预留</h3></div><span className="status waiting">NOT CONNECTED</span></div>
    <div className="coach-message"><p>当前不会生成虚假的建议。你可以先正常记录任务、材料与完成情况；接入模型后，历史数据将直接成为监督与复盘的依据。</p><div><button disabled>开始 AI 访谈</button><button disabled>生成今日建议</button></div></div>
    <div className="coach-rules"><span>原始数据保留 ✓</span><span>人工操作完整 ✓</span><span>模型可替换 ✓</span><span>公开前确认 ✓</span></div>
  </div>;
}

export function SettingsControls() {
  const [states, setStates] = useState([true, true, false, true, true]);
  const labels = ["早间计划提醒", "任务到期追问", "自动生成晚间复盘", "AI 调整任务粒度", "材料自动识别与归档"];
  return <div className="settings-list">{labels.map((label, i) => <label key={label}><span><b>{label}</b><small>{i === 2 ? "每天 22:30" : "可以随时在移动端暂停"}</small></span><input type="checkbox" checked={states[i]} onChange={() => setStates(states.map((v, n) => n === i ? !v : v))} /></label>)}</div>;
}
