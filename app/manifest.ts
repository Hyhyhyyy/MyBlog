import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hyhyhyyy · 成长工作台",
    short_name: "HYHY 工作台",
    description: "目标、学习、项目、经历与成长记录的私人工作台。",
    start_url: "/studio/today",
    scope: "/",
    display: "standalone",
    background_color: "#eee9df",
    theme_color: "#762c29",
    orientation: "portrait-primary",
    categories: ["productivity", "education", "lifestyle"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "今日计划", short_name: "今日", url: "/studio/today" },
      { name: "快速记录", short_name: "记录", url: "/studio/inbox" },
      { name: "材料库", short_name: "材料", url: "/studio/archive" },
    ],
  };
}
