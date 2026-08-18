# MyBlog · Hyhyhyyy 成长档案

基于纯 HTML / CSS / JS 的 Neo-Brutalism（新粗野主义）风格个人博客，由 GitHub Pages 静态托管，记录学习、项目与公开表达。视觉语言为「番茄红 + 粗黑描边 + 硬阴影」的高对比编辑风，首页背景是番茄点阵（DotField）动效。

---

## 在线访问

https://hyhyhyyy.github.io/MyBlog/

---

## 站点结构

- **首页 `index.html`**：番茄点阵动态背景（DotField，鼠标交互时番茄被推开），顶部导航 + lanyard 滚动信息条。
- **项目 `projects.html`**：仓库项目卡片轮播，实时渲染各仓库 README，按 URL 身份映射配色。
- **娱乐合集 `collections.html`**：主题合集卡片墙，支持 3D 倾斜与光标交互。
- **学习笔记 `study.html`**：番茄团式笔记索引，拖拽或点击文件夹切换，跳转至对应独立页。
- **关于 `about.html`**：个人信息与简介。
- **独立页**：笔记与娱乐具体内容介绍页面若干。

---

## 技术与部署

- **技术栈**：纯静态前端，无构建步骤；原生 JS + Canvas 实现动效（DotField / InfiniteMenu / DriftWall 等），部分页面借助 GSAP。
- **设计语言**：Neo-Brutalism——粗黑描边、硬阴影、番茄红 `#d8583d` 作主强调，搭配暖纸底色。
- **部署**：源码位于 `prototype/neo-brutalist/`，通过 GitHub Pages（`gh-pages` 分支）发布；更新经 `gh api` 写入双分支（`gh-pages` 根 + `main/prototype/neo-brutalist/`）并触发 Pages 构建。

---

## 目录（prototype/neo-brutalist/）

核心页面：`index.html`、`projects.html`、`collections.html`、`study.html`、`about.html`；配套 `style.css` 与各类动效脚本（DotField / gooey-nav / drift-wall / infinite-menu / lanyard 等）；图片与封面资源位于 `assets/`。
