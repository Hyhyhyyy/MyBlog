// Static-site generator for Hyhyhyyy Growth Archive.
//
// The live app runs on Cloudflare Workers (vinext) and cannot be hosted on a
// plain static host. This script emits a fully static `dist/` (HTML + CSS) that
// mirrors the public pages, so the blog can be deployed to Tencent CloudBase
// static hosting (or any static host) without the OpenAI Sites / Workers runtime.
//
// Run:  node scripts/build-static.mjs
// Output: out/ (index.html, notes/, collections/, projects/, about/, styles.css, favicon.svg)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
// Output to a dedicated folder (separate from the Workers `dist/` bundle) so
// static hosting only serves the generated HTML/CSS.
const outDir = path.join(root, "out");

/* ----------------------------- markdown ----------------------------- */

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { meta: {}, body: raw };
  const fm = match[1];
  const body = raw.slice(match[0].length);
  const meta = {};
  for (const line of fm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) meta[key] = value;
  }
  return { meta, body };
}

function parseTags(value) {
  const v = value.trim();
  if (v.startsWith("[") && v.endsWith("]")) {
    return v
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return v.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text) {
  let t = escapeHtml(text);
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>");
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return t;
}

const BLOCK_START = /^(#{1,6}\s|>\s|\s*[-*]\s|\s*\d+\.\s|```|---+$)/;

function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let inCode = false;
  let codeBuf = [];
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeBuf = [];
      } else {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        inCode = false;
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      out.push("<hr />");
      i++;
      continue;
    }
    if (line.trim().startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${buf.map(inline).join("<br />")}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(`<ul>${buf.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(`<ol>${buf.map((x) => `<li>${inline(x)}</li>`).join("")}</ol>`);
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() !== "" && !BLOCK_START.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${buf.map(inline).join("<br />")}</p>`);
  }
  return out.join("\n");
}

function parsePost(slug, raw) {
  const { meta, body } = parseFrontmatter(raw);
  const category = meta.category === "collections" ? "collections" : "notes";
  return {
    slug,
    title: meta.title || slug,
    date: meta.date || "",
    category,
    excerpt: meta.excerpt || "",
    tags: parseTags(meta.tags || ""),
    html: renderMarkdown(body),
  };
}

/* ----------------------------- data ----------------------------- */

const postsDir = path.join(root, "content", "posts");
const posts = fs
  .readdirSync(postsDir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => parsePost(f.replace(/\.md$/, ""), fs.readFileSync(path.join(postsDir, f), "utf8")))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const notes = posts.filter((p) => p.category === "notes");
const collections = posts.filter((p) => p.category === "collections");

const projectsData = JSON.parse(
  fs.readFileSync(path.join(root, "data", "projects.json"), "utf8"),
);
const projects = Array.isArray(projectsData.projects) ? projectsData.projects : [];
const generatedAt = projectsData.generatedAt || null;

/* ----------------------------- templates ----------------------------- */

const publicNav = [
  ["项目作品", "Projects", "/projects"],
  ["知识笔记", "Notes", "/notes"],
  ["文学书架", "Library", "/collections"],
  ["关于", "About", "/about"],
];

const archiveCards = [
  { no: "A-001", title: "项目与作品", titleEn: "Projects & Works", body: "记录实践与创造的过程，从想法到落地的每一步。", bodyEn: "Documenting every step from an idea to a working result.", href: "/projects", tone: "ink", mark: "◇" },
  { no: "B-002", title: "学习与思考", titleEn: "Learning & Reflection", body: "沉淀知识与思考的痕迹，在阅读与探索中理解世界。", bodyEn: "Preserving traces of learning, reading and reflection.", href: "/notes", tone: "sage", mark: "▢" },
  { no: "C-003", title: "校园经历", titleEn: "Campus Life", body: "定格校园生活的片段，在合作与成长中遇见更多可能。", bodyEn: "Moments of collaboration, participation and growth on campus.", href: "/about", tone: "sand", mark: "⌂" },
];

// Bilingual helper: shows Chinese by default, English only when html[data-language="en"].
function L(zh, en) {
  return `<span class="translatable"><span lang="zh">${escapeHtml(zh)}</span><span lang="en">${escapeHtml(en)}</span></span>`;
}

// Link helper: some static hosts (e.g. CloudStudio) do NOT resolve a directory
// to its index.html and fall back to the root page for clean URLs like
// `/projects/` or `/notes/slug`. Append `/index.html` so internal links work on
// every static host (CloudStudio, CloudBase, GitHub Pages, Netlify). Root "/"
// and absolute http(s) URLs are left untouched.
function toIndex(u) {
  if (u === "/" || /^https?:/i.test(u)) return u;
  return u.replace(/\/+$/, "") + "/index.html";
}

function navHtml(active) {
  const links = publicNav
    .map(
      ([label, labelEn, href]) =>
        `<a class="${active === href.slice(1) ? "active" : ""}" href="${toIndex(href)}"><span>${label}</span><small>${labelEn}</small></a>`,
    )
    .join("");
  return `<header class="public-header"><a class="brand" href="/"><b>HYHY</b><span>/</span><em>Growth Archive</em></a><nav aria-label="公开导航">${links}</nav></header>`;
}

function footerHtml() {
  return `<footer class="public-footer"><div><span class="seal">HY</span><b>Hyhyhyyy Growth Archive</b></div><p>把走过的路，编成可翻阅的页。</p><div class="footer-links"><a href="${toIndex("/projects")}">项目作品</a><a href="${toIndex("/collections")}">文学书架</a><a href="${toIndex("/about")}">关于</a></div></footer>`;
}

function shell({ active = "", title, description, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="icon" href="/favicon.svg" />
<link rel="stylesheet" href="/styles.css" />
</head>
<body>
<div class="paper-site">
${navHtml(active)}
${bodyHtml}
${footerHtml()}
</div>
</body>
</html>`;
}

function pageHeading({ eyebrow, title, titleEn, intro, introEn, chapter }) {
  return `<section class="page-heading"><span class="folio-mark" aria-hidden="true">HY / ${chapter}</span><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="bilingual-title"><span>${escapeHtml(title)}</span><small>${escapeHtml(titleEn)}</small></h1><p class="lede">${L(intro, introEn)}</p></div><div class="chapter-stamp"><span>CHAPTER</span><strong>${chapter}</strong><i></i></div></section>`;
}

/* ----------------------------- pages ----------------------------- */

function homePage() {
  const cards = archiveCards
    .map(
      (c) => `<a class="archive-card" href="${toIndex(c.href)}"><i class="card-sheen" aria-hidden="true"></i><small>NO. ${c.no}</small><div class="card-mark ${c.tone}">${c.mark}</div><div><h3 class="card-bilingual-title"><span>${c.title}</span><small>${c.titleEn}</small></h3><i></i><p>${L(c.body, c.bodyEn)}</p></div><span>→</span></a>`,
    )
    .join("");
  const body = `<main>
<section class="home-hero">
<div class="hero-copy">
<p class="eyebrow">PERSONAL GROWTH ARCHIVE · 2029</p>
<h1>Hyhyhyyy</h1>
<p class="profile-line">大连理工大学计算机类 · 2029</p>
<i class="red-rule"></i>
<h2 class="bilingual-hero"><span>敬，真相与自由！</span><small>TO TRUTH AND FREEDOM.</small></h2>
<a class="vermilion-button" href="${toIndex("/projects")}">${L("翻阅成长档案", "Explore the Archive")} <span>→</span></a>
<p class="hero-footnote">${L("把走过的路，编成可翻阅的页。", "Binding the road travelled into pages worth revisiting.")}</p>
</div>
<div class="archive-object" aria-label="私人藏书票视觉装置">
<p class="margin-note note-top">这里记录着<br/>反复思考过的瞬间。</p>
<div class="paper back-one"></div>
<div class="paper back-two"></div>
<div class="paper main-paper"><small>GROWTH ARCHIVE<br/>PERSONAL LIBRARY</small><strong>HY</strong><span class="seal">HY</span></div>
<div class="chapter-rail"><span>CHAPTER</span><b>01</b><i class="current"></i><i></i><i></i><small>04</small></div>
<p class="margin-note note-bottom">悬停可见批注。</p>
</div>
</section>
<section class="archive-index">${cards}</section>
<section class="act-intro"><div><p class="eyebrow">ACT I · SCENE 01</p><h2>成长不是一张完成表，<br/>而是一部仍在书写的长篇。</h2></div><p>公开页面呈现已经确认的作品、经历与思考；其余草稿与私人复盘在本地整理。每一条记录都能在未来成为项目、文章素材或阶段成果。</p></section>
</main>`;
  return shell({ title: "Hyhyhyyy · Growth Archive", description: "把走过的路，编成可翻阅的页。", bodyHtml: body });
}

function notesPage() {
  const tags = Array.from(new Set(notes.flatMap((p) => p.tags)));
  const tagHtml = tags.length
    ? tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")
    : "<span>暂无</span>";
  const listHtml = notes
    .map(
      (p) => `<a class="notes-card" href="${toIndex(`/notes/${p.slug}`)}"><p class="eyebrow">${escapeHtml(p.date)}</p><h2>${escapeHtml(p.title)}</h2><p>${escapeHtml(p.excerpt)}</p><small>${p.tags.map(escapeHtml).join(" · ")}</small></a>`,
    )
    .join("");
  const body = `<main class="public-page">
${pageHeading({ eyebrow: "NOTEBOOK & ESSAYS", title: "知识笔记", titleEn: "Knowledge Notes", intro: "阅读、课程、技术与生活中的问题，在这里经过整理、批注与重新理解。", introEn: "Questions from reading, study, technology and life are organised, annotated and understood anew.", chapter: "03" })}
<section class="note-layout"><aside><p class="eyebrow">INDEX</p><h3>标签</h3><div class="paper-tags">${tagHtml}</div></aside><div class="notes-list">${listHtml}</div></section>
</main>`;
  return shell({ active: "notes", title: "知识笔记 · Hyhyhyyy Growth Archive", description: "知识笔记与随笔。", bodyHtml: body });
}

function collectionsPage() {
  const listHtml = collections
    .map(
      (p) => `<a class="notes-card" href="${toIndex(`/collections/${p.slug}`)}"><p class="eyebrow">${escapeHtml(p.date)}</p><h2>${escapeHtml(p.title)}</h2><p>${escapeHtml(p.excerpt)}</p><small>${p.tags.map(escapeHtml).join(" · ")}</small></a>`,
    )
    .join("");
  const body = `<main class="public-page">
${pageHeading({ eyebrow: "PRIVATE LIBRARY · PUBLIC SHELF", title: "文学书架", titleEn: "Literary Library", intro: "喜欢的中英文小说、戏剧与影视作品，会以短摘录、个人批注和观看记忆进入这间私人阅读室。", introEn: "Chinese and English novels, theatre and screen works enter this reading room through brief excerpts and personal notes.", chapter: "04" })}
<section class="shelf-intro"><div class="ex-libris"><small>EX LIBRIS</small><strong>HY</strong><span>BOOKS · THEATRE · SCREEN</span></div><div><h2>收藏作品，也收藏被作品照亮的瞬间。</h2><p>这里不复制长篇文本、剧照或受保护的角色素材。每条收藏记录作品信息、短摘录、个人批注、发生时间与公开权限。</p></div></section>
<section class="notes-list collection-list">${listHtml}</section>
</main>`;
  return shell({ active: "collections", title: "文学书架 · Hyhyhyyy Growth Archive", description: "文学书架与文艺经历。", bodyHtml: body });
}

function repoInitials(name) {
  const parts = name.split(/[-_\s]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function projectsPage() {
  const featured = projects[0];
  const rest = projects.slice(1);
  let inner = "";
  if (projects.length === 0) {
    inner = `<section class="project-empty"><p class="eyebrow">SNAPSHOT · 待填充</p><h2>公开仓库信息将在刷新后自动出现</h2><p>本项目从 <a href="https://github.com/Hyhyhyyy" target="_blank" rel="noopener noreferrer">github.com/Hyhyhyyy</a> 的公开仓库读取数据，以静态快照形式呈现，不依赖运行时接口。</p><a class="text-link" href="https://github.com/Hyhyhyyy" target="_blank" rel="noopener noreferrer">前往 GitHub 主页 →</a></section>`;
  } else {
    let featuredHtml = "";
    if (featured) {
      const topics =
        featured.topics.length > 0
          ? featured.topics.slice(0, 5).map((t) => `<span>${escapeHtml(t)}</span>`).join("")
          : `<span>${escapeHtml(featured.language || "Repository")}</span>`;
      featuredHtml = `<section class="featured-project"><div><p class="eyebrow">CURRENT PROJECT · ${escapeHtml(featured.language || "REPO")}</p><h2>${escapeHtml(featured.name)}</h2><p>${escapeHtml(featured.description || "暂无描述。")}</p><div class="paper-tags">${topics}</div><a class="text-link" href="${toIndex(`/projects/${featured.slug}`)}">阅读项目档案 →</a></div><div class="project-poster-wrap"><div class="project-poster"><small>PROJECT FILE / 001</small><strong>${escapeHtml(repoInitials(featured.name))}</strong><span>${escapeHtml((featured.topics[0] || "REPO").toUpperCase())}</span></div></div></section>`;
    }
    const gridHtml = rest.length
      ? `<section class="project-grid">${rest
          .map(
            (p) => `<article><span class="status private">${escapeHtml(p.language || "REPO")}</span><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description || "暂无描述。")}</p><a class="text-link" href="${toIndex(`/projects/${p.slug}`)}">查看档案 →</a></article>`,
          )
          .join("")}</section>`
      : "";
    inner = featuredHtml + gridHtml;
  }
  const snap = generatedAt
    ? `<p class="project-snapshot-time">数据快照生成于 ${new Date(generatedAt).toLocaleDateString("zh-CN")}</p>`
    : "";
  const body = `<main class="public-page">
${pageHeading({ eyebrow: "WORKS & PRACTICE", title: "项目与作品", titleEn: "Projects & Works", intro: "项目不是结果陈列柜，而是问题、选择、迭代与验证共同组成的创作档案。", introEn: "Projects are creative records of questions, choices, iteration and validation—not merely finished results.", chapter: "02" })}
${inner}
${snap}
</main>`;
  return shell({ active: "projects", title: "项目与作品 · Hyhyhyyy Growth Archive", description: "项目与作品集。", bodyHtml: body });
}

function aboutPage() {
  const cards = archiveCards
    .map(
      (c) => `<a href="${toIndex(c.href)}"><small>${c.no}</small><b>${c.title}</b><span>→</span></a>`,
    )
    .join("");
  const body = `<main class="public-page">
${pageHeading({ eyebrow: "PROFILE & EDUCATION", title: "关于 Hyhyhyyy", titleEn: "About Hyhyhyyy", intro: "一名来自北京海淀的大连理工大学计算机类学生，喜欢文学、戏剧、技术与真实的问题。", introEn: "A computer science student at Dalian University of Technology from Haidian, Beijing, drawn to literature, theatre, technology and honest questions.", chapter: "05" })}
<section class="about-grid"><div class="portrait-placeholder"><span>HY</span><small>PORTRAIT<br/>TO BE ADDED</small></div><div class="about-copy"><p class="eyebrow">PROFILE</p><h2>敬，真相与自由！</h2><dl><div><dt>身份</dt><dd>大连理工大学计算机类 · 2029 届</dd></div><div><dt>来自</dt><dd>北京海淀</dd></div><div><dt>性格</dt><dd>ENFJ</dd></div><div><dt>兴趣</dt><dd>中英文小说、文学、戏剧、电视剧与技术创造</dd></div></dl></div></section>
<section class="education-sheet"><p class="eyebrow">EDUCATION</p><div><span>现在</span><h3>大连理工大学</h3><p>计算机类 · 2029 届本科生</p></div><div><span>此前</span><h3>北京市十一学校</h3><p>初高中成长经历 · 内容已整理后公开</p></div></section>
<section class="about-index">${cards}</section>
</main>`;
  return shell({ active: "about", title: "关于 · Hyhyhyyy Growth Archive", description: "关于 Hyhyhyyy。", bodyHtml: body });
}

function articlePage(post) {
  const backHref = post.category === "notes" ? "/notes" : "/collections";
  const backLabel = post.category === "notes" ? "返回知识笔记" : "返回文学书架";
  const meta = [post.date, ...post.tags].filter(Boolean).join("　·　");
  const body = `<main class="public-page"><article class="post-article"><a class="back-link" href="${toIndex(backHref)}">← ${backLabel}</a><p class="eyebrow">${escapeHtml(meta)}</p><h1>${escapeHtml(post.title)}</h1><div class="post-body">${post.html}</div></article></main>`;
  return shell({ active: post.category === "notes" ? "notes" : "collections", title: `${post.title} · Hyhyhyyy Growth Archive`, description: post.excerpt, bodyHtml: body });
}

function projectDetailPage(project) {
  const updated = project.updatedAt ? new Date(project.updatedAt).toLocaleDateString("zh-CN") : "未知";
  const topicsSection =
    project.topics.length > 0
      ? `<section class="project-story"><aside><p>TOPICS</p><span>${project.topics.length} 个标签</span></aside><div><h2>技术栈与主题</h2><div class="paper-tags">${project.topics.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>${project.homepage ? `<p><a class="text-link" href="${escapeHtml(project.homepage)}" target="_blank" rel="noopener noreferrer">访问项目主页 →</a></p>` : ""}</div></section>`
      : "";
  const body = `<main class="public-page project-detail"><a class="back-link" href="${toIndex("/projects")}">← 返回项目</a><header><p class="eyebrow">PROJECT FILE · ${escapeHtml(project.language || "REPO")}</p><h1>${escapeHtml(project.name)}</h1><p>${escapeHtml(project.description || "暂无描述。")}</p></header><section class="project-meta"><div><small>REPO</small><b><a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.name)}</a></b></div><div><small>LANGUAGE</small><b>${escapeHtml(project.language || "—")}</b></div><div><small>STARS</small><b>${project.stars}</b></div><div><small>FORKS</small><b>${project.forks}</b></div></section>${topicsSection}<section class="project-scenes"><article class="done"><span>01</span><h3>仓库</h3><p>公开仓库，源码与提交历史可在 GitHub 查看。</p></article><article class="done"><span>02</span><h3>主题</h3><p>${project.topics.length ? escapeHtml(project.topics.join("、")) : "未标注主题"}</p></article><article class="done"><span>03</span><h3>活跃</h3><p>最近更新 ${updated}</p></article></section></main>`;
  return shell({ active: "projects", title: `${project.name} · Hyhyhyyy Growth Archive`, description: project.description || project.name, bodyHtml: body });
}

/* ----------------------------- emit ----------------------------- */

function writeFile(relPath, content) {
  const full = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function build() {
  // Note: cleaning via fs.rmSync is intentionally avoided — the sandbox
  // safe-delete hook wraps Node rmSync and fails closed. Clean the output
  // folder with a native `rm -rf out` before running if a fresh build is needed.
  fs.mkdirSync(outDir, { recursive: true });

  writeFile("index.html", homePage());
  writeFile("notes/index.html", notesPage());
  writeFile("collections/index.html", collectionsPage());
  writeFile("projects/index.html", projectsPage());
  writeFile("about/index.html", aboutPage());

  for (const p of notes) writeFile(`notes/${p.slug}/index.html`, articlePage(p));
  for (const p of collections) writeFile(`collections/${p.slug}/index.html`, articlePage(p));
  for (const p of projects) writeFile(`projects/${p.slug}/index.html`, projectDetailPage(p));

  // styles: globals.css + blog.css
  const css = [
    fs.readFileSync(path.join(root, "app", "globals.css"), "utf8"),
    fs.readFileSync(path.join(root, "app", "blog.css"), "utf8"),
  ].join("\n");
  writeFile("styles.css", css);

  // favicon
  const faviconSrc = path.join(root, "public", "favicon.svg");
  if (fs.existsSync(faviconSrc)) writeFile("favicon.svg", fs.readFileSync(faviconSrc, "utf8"));

  console.log(
    `Built out/ → ${posts.length} posts (${notes.length} notes, ${collections.length} collections), ${projects.length} projects.`,
  );
}

build();
