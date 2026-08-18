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

基于 [vinext](https://github.com/cloudflare/vinext)（Next.js 16 RSC + React 19 + Tailwind v4 + Drizzle/D1 on Cloudflare Workers）构建的个人成长记录与公开表达系统。本仓库在 vinext 起步模板之上沉淀个人内容、笔记与作品，并保留完整的全栈构建与可观测能力。

维护者：**郝奕（Hyhyhyyy）**

> 本仓库基于 vinext-starter 模板；下方技术说明保留了模板中仍然适用的部分。

## 技术栈

- **框架**：Next.js 16（React Server Components）
- **前端**：React 19 + Tailwind CSS v4
- **数据**：Drizzle ORM + Cloudflare D1（可选）
- **运行 / 部署**：Cloudflare Workers（Vinext/Sites）

## 环境要求

- Node.js `>=22.13.0`
- Linux 环境，需具备 `flock`、`curl` 与 GNU `timeout`

## 仓库结构

- `app/`：站点源码
- `app/chatgpt-auth.ts`：可选的 ChatGPT 登录辅助（dispatch 托管）
- `.openai/hosting.json`：可选的 Sites D1 / R2 绑定声明
- `vite.config.ts`：本地开发时模拟已声明的绑定
- `db/index.ts`：从 Cloudflare Worker 环境读取 D1 绑定
- `db/schema.ts`：Drizzle schema（初始为空）
- `examples/d1/`：可选的 D1 示例
- `drizzle.config.ts`：本地迁移生成（按需）
- `scripts/sites-env.sh`：需要可写项目级 home / npm / XDG / 临时路径的脚本

## 快速开始

编辑 `app/` 下的源码，待一个连贯的里程碑可检视 / 分享时提交；远程 Sites 构建器会针对推送的提交执行 `npm run build`。请勿把安装 / 构建当作常规 pre-checkpoint 步骤重复执行。

本起步模板不使用 `wrangler.jsonc`。`install:ci` 为单次、不重试的 `npm ci`：对同一项目拒绝并发安装，优先使用带 `--prefer-offline` 的 npm 缓存，缺失缓存时回退到 registry 下载并校验 `package-lock.json` 中记录的完整 vinext tarball，限制 npm 为单 socket，并在安装卡死时终止。生成的 `.sites-runtime/` 目录可丢弃，已被 Git 忽略。

## 常用脚本与诊断命令

- `npm run install:ci`：执行受控的单一 lockfile 安装
- `npm run dev`：启动 Vite / Vinext 开发服务器
- `npm run build`：构建并校验可部署的 Sites 产物
- `npm run start`：启动构建后的 Vinext 应用
- `npm test`：构建、校验并验证开发预览元数据
- `npm run validate:artifact`：复查既有产物的 manifest 与 ESM `default.fetch` 导出
- `npm run db:generate`：schema 变更后生成 Drizzle 迁移

远程构建失败后用 build / validate 命令做定向诊断，不要将其纳入常规 checkpoint 路径。超时默认值可通过 `SITES_INSTALL_TIMEOUT`、`SITES_INSTALL_KILL_AFTER`、`SITES_BUILD_TIMEOUT`、`SITES_BUILD_KILL_AFTER` 在受控灰度中覆盖；超时会使命令失败，helper 永不重试未变更的 install / build。

## 身份与登录（可选）

`app/chatgpt-auth.ts` 提供可选的 ChatGPT 登录辅助：

- `getChatGPTUser()`：可选登录态 UI
- `requireChatGPTUser(returnTo)`：服务端渲染页将匿名访客导向「使用 ChatGPT 登录」
- `chatGPTSignInPath(returnTo)` / `chatGPTSignOutPath(returnTo)`：浏览器链接或动作

传入同源相对 `returnTo` 作为登录 / 登出后的目的地，helper 会校验并安全编码。受保护页需声明 `export const dynamic = "force-dynamic"`（依赖每请求身份头）。Dispatch 拥有 `/signin-with-chatgpt`、`/signout-with-chatgpt`、`/callback`、OAuth cookie 与身份头注入，请勿在应用侧实现这些保留路径；未引入并调用该 helper 的路由保持匿名兼容。SIWC 仅建立身份、不证明工作区成员，工作区级限制请用 Sites 托管平台的访问策略，或显式服务端成员 / 白名单校验。

读取当前用户标识（可选、降级到邮箱）：

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## 了解更多

- [vinext 文档](https://github.com/cloudflare/vinext)
- [Drizzle D1 指南](https://orm.drizzle.team/docs/get-started/d1-new)
