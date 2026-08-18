<p align="center">
  <img src="banner.svg" alt="MyBlog hero banner">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/framework-Next.js%2016-000000" alt="framework">
  <img src="https://img.shields.io/badge/frontend-React%2019-61DAFB" alt="react">
  <img src="https://img.shields.io/badge/styling-Tailwind%20v4-38B2AC" alt="tailwind">
  <img src="https://img.shields.io/badge/runtime-Cloudflare%20Workers-F38020" alt="workers">
  <img src="https://img.shields.io/badge/orm-Drizzle-C5F74F" alt="drizzle">
</p>

# MyBlog · Hyhyhyyy 成长档案

基于 [vinext](https://github.com/cloudflare/vinext)（Next.js 16 RSC + React 19 + Tailwind v4 + Drizzle/D1 on Cloudflare Workers）构建的个人成长记录与公开表达系统，视觉上以「番茄红 + 暖纸」的编辑风为设计语言。

维护者：**郝奕（Hyhyhyyy）**

---

## 网站基本组成

站点以一套动态路由骨架串起多种内容形态，模块本身只作内容分区，下面不展开各模块内的具体篇目：

- **首页与动态模块（`app/[section]`）**：通过动态路由挂载「学习」「娱乐」等内容模块，是整站的内容骨架；模块内的具体条目不在此罗列。
- **合集（`app/collections/[slug]`）**：把相关条目归并成主题合集。
- **笔记（`app/notes/[slug]`）**：零散的思考与记录。
- **项目（`app/projects/[slug]`）**：独立成篇的项目档案。
- **文章阅读（`app/components/post-article.tsx`）**：统一的文章呈现组件。

一句话概括：**以 `[section]` 为骨架，串联合集 / 笔记 / 项目 / 文章；「学习」「娱乐」等模块即挂载其上的内容分区。**

---

## 丰富动效实现组成

动效由 **Framer Motion 11** 驱动，并按职责分成的若干层（`app/` 下对应文件）：

1. **声明式动画层**（`app/components/motion.tsx`）：可复用的组件级 spring / fade / layout 动画原语。
2. **路由过渡层**（`app/template.tsx` + `app/components/route-fade.tsx`）：借助 Next.js `template` 在每次导航重挂载时做淡入过渡。
3. **物理首屏层**（`app/components/hero-physics.tsx`）：以弹簧物理驱动的首屏 hero 动效。
4. **微交互层**（`app/components/interactions.tsx`）：滚动联动、悬停、手势等轻量反馈。
5. **样式动效层**（`app/motion.css`）：纯 CSS 关键帧与过渡，补足声明式动画之外的细节。

---

## 番茄的设计概念

视觉系统的核心是「番茄红 + 暖纸」的编辑风：

- **配色**：以暖纸 `#f4f0e7` 为底，番茄红 `#d8583d`（深红 `#913b2c`）作唯一主强调，深墨 `#13253a` 为文字，辅以 sage `#a9ada3` 等中性色；展示字体采用衬线（华文中宋 / Bodoni），营造沉静的编辑感。
- **隐喻**：`vinext = vine + next`——番茄生于藤蔓，恰喻「在 Next.js / React 全栈之藤上生长的个人记录」；全站叠加密点纸纹（`.paper-site`），带来手感与温度。
- **体验原则**：红色只作点睛（选中态、链接、强调），大量留白与衬线排版保证可读与沉静，避免视觉噪音。

---

## 技术栈

- **框架**：Next.js 16（React Server Components）
- **前端**：React 19 + Tailwind CSS v4
- **数据**：Drizzle ORM + Cloudflare D1（可选）
- **运行 / 部署**：Cloudflare Workers（Vinext / Sites）
- **动效**：Framer Motion 11

## 了解更多

- [vinext 文档](https://github.com/cloudflare/vinext)
- [Drizzle D1 指南](https://orm.drizzle.team/docs/get-started/d1-new)
