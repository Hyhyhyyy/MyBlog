# Hyhyhyyy Growth Archive｜项目进度存档

导出日期：2026-07-30

## 当前线上版本

- 网站名称：Hyhyhyyy · 成长档案
- 线上地址：https://hyhy-growth.deca-live-op-8315.chatgpt.site
- 已部署版本：Version 10
- 访问范围：仅指定管理员账户

## 已实现

- 中英双语、半复古纸张档案风格的公开展示首页
- 私人工作台及管理员入口
- 目标、学习、项目、经历、成果等长期记录
- 任务增删改查、专注计时和成长收件箱
- 文件上传、下载、删除和 JSON 数据导出
- 可安装到手机桌面的 PWA
- 移动端底部导航及完整工作台入口
- 离线提示、已访问页面缓存和离线速记草稿
- 手机录音、音频上传、长期存储及转写任务入队
- AI 服务商无关的接口层与模型路由预留
- 网页端与移动端操作指南

## AI 接口状态

录音、上传、保存和任务排队已经完成。当前尚未配置阿里云百炼 API Key，因此自动语音转写与 AI 总结会保持 `waiting_for_provider` 状态。配置正式密钥后即可继续接通。

预留模型：

- 日常整理：qwen3.7-plus
- 深度复盘：qwen3.7-max
- 轻量任务：qwen3.6-flash
- 多模态理解：qwen3.5-omni-plus
- 实时语音识别：fun-asr-realtime
- 录音文件识别：fun-asr
- 向量检索：text-embedding-v4
- 重排序：qwen3-rerank
- 备用模型：deepseek-v4-pro

## 本地启动

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 文件说明

- `app/`：页面、接口和主要交互
- `db/`、`drizzle/`：数据结构与数据库迁移
- `lib/`：AI 接口、存储和通用逻辑
- `public/`：PWA、图标和静态资源
- `worker/`：云端运行入口
- `.openai/hosting.json`：当前 Sites 项目标识

## 数据说明

本文件夹保存的是当前完整源码与数据库结构，不包含线上数据库中的私人记录、上传文件、访问令牌或 API 密钥。线上数据仍保存在网站绑定的 D1/R2 存储中。
