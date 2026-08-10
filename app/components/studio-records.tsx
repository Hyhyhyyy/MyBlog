"use client";

// studio-records.tsx — Studio CRUD UI for "成长记录" (records).
// Talks to the existing /api/records routes (Drizzle/D1 + ChatGPT auth).
// Lively but calm: list items animate in/out, the compose form springs open.

import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type RecordRow = {
  id: number;
  category: string;
  title: string;
  description: string;
  status: string;
  visibility: string;
  startedAt: string | null;
  endedAt: string | null;
};

const CATEGORIES = ["goal", "study", "project", "experience", "achievement", "review"];
const CATEGORY_LABEL: Record<string, string> = {
  goal: "目标", study: "学习", project: "项目", experience: "经历", achievement: "成果", review: "复盘",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "草稿", active: "进行中", completed: "已完成", archived: "已归档",
};

export default function StudioRecords() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [auth, setAuth] = useState<boolean | null>(null);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({ category: "experience", title: "", description: "", startedAt: "", endedAt: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const reduce = useReducedMotion();

  async function load() {
    try {
      const res = await fetch("/api/records");
      if (res.status === 401) {
        setAuth(false);
        return;
      }
      const data = await res.json();
      setRows(data.records ?? []);
      setAuth(true);
    } catch {
      setAuth(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ category: "experience", title: "", description: "", startedAt: "", endedAt: "" });
      setComposing(false);
      setEditingId(null);
      load();
    }
  }

  async function patch(id: number, patch: Partial<RecordRow>) {
    await fetch("/api/records", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    load();
  }

  async function remove(id: number) {
    await fetch(`/api/records?id=${id}`, { method: "DELETE" });
    load();
  }

  if (auth === false)
    return (
      <p className="studio-notice">
        需要登录后才能管理记录。请通过 ChatGPT / 工作区身份登录后回到此处。
      </p>
    );

  return (
    <div className="records-studio">
      <div className="records-toolbar">
        <button className="ink-button" onClick={() => setComposing((v) => !v)}>
          {composing ? "收起" : "新建记录"} <span>＋</span>
        </button>
        <span className="records-count">{rows.length} 条记录</span>
      </div>

      <AnimatePresence>
        {composing && (
          <motion.form
            className="record-form"
            onSubmit={submit}
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={reduce ? undefined : { opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div className="form-row">
              <label>类别</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>标题</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：进入大连理工大学计算机类" />
            </div>
            <div className="form-row">
              <label>描述</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="一句话记录这段经历" />
            </div>
            <div className="form-row two">
              <div>
                <label>开始</label>
                <input type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} />
              </div>
              <div>
                <label>结束</label>
                <input type="date" value={form.endedAt} onChange={(e) => setForm({ ...form, endedAt: e.target.value })} />
              </div>
            </div>
            <button className="vermilion-button" type="submit">保存到档案</button>
          </motion.form>
        )}
      </AnimatePresence>

      <ul className="records-list">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.li
              key={r.id}
              layout
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="record-item"
            >
              <div className="record-main">
                <span className={`record-cat cat-${r.category}`}>{CATEGORY_LABEL[r.category]}</span>
                <b>{r.title}</b>
                {r.description && <p>{r.description}</p>}
                <small>
                  {STATUS_LABEL[r.status] ?? r.status} · {r.visibility === "public" ? "公开" : "私密"}
                  {r.startedAt ? ` · ${r.startedAt}` : ""}
                </small>
              </div>
              <div className="record-actions">
                <button
                  onClick={() =>
                    patch(r.id, { visibility: r.visibility === "public" ? "private" : "public" })
                  }
                  title="切换公开/私密"
                >
                  {r.visibility === "public" ? "转私密" : "转公开"}
                </button>
                <button onClick={() => patch(r.id, { status: r.status === "completed" ? "active" : "completed" })} title="切换完成">
                  {r.status === "completed" ? "进行中" : "完成"}
                </button>
                <button className="danger" onClick={() => remove(r.id)} title="删除">
                  删除
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {rows.length === 0 && <li className="record-empty">还没有记录。点击「新建记录」写下第一条成长痕迹。</li>}
      </ul>
    </div>
  );
}
