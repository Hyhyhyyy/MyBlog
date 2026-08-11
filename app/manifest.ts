import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hyhyhyyy · 成长档案",
    short_name: "HYHY 档案",
    description: "一份可翻阅的个人成长档案：项目、笔记、文学书架与关于。",
    start_url: "/",
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
      { name: "项目作品", short_name: "项目", url: "/projects" },
      { name: "知识笔记", short_name: "笔记", url: "/notes" },
      { name: "文学书架", short_name: "书架", url: "/collections" },
    ],
  };
}
