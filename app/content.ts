export const publicNav = [
  ["成长时间线", "Timeline", "/timeline"],
  ["项目作品", "Projects", "/projects"],
  ["知识笔记", "Notes", "/notes"],
  ["文学书架", "Library", "/collections"],
  ["关于", "About", "/about"],
] as const;

export const archiveCards = [
  { no: "A-001", title: "项目与作品", titleEn: "Projects & Works", body: "记录实践与创造的过程，从想法到落地的每一步。", bodyEn: "Documenting every step from an idea to a working result.", href: "/projects", tone: "ink", mark: "◇" },
  { no: "B-002", title: "学习与思考", titleEn: "Learning & Reflection", body: "沉淀知识与思考的痕迹，在阅读与探索中理解世界。", bodyEn: "Preserving traces of learning, reading and reflection.", href: "/notes", tone: "sage", mark: "▢" },
  { no: "C-003", title: "校园经历", titleEn: "Campus Life", body: "定格校园生活的片段，在合作与成长中遇见更多可能。", bodyEn: "Moments of collaboration, participation and growth on campus.", href: "/timeline", tone: "sand", mark: "⌂" },
] as const;

export const campusRoles = [
  "校阳光心理协会副部长",
  "校团委宣传部新媒体运营中心干事",
  "校开发区极限飞盘社干事",
  "校开发区声韵外语音乐剧社干事",
];

export const studioNav = [
  ["今日", "Today", "/studio/today", "01"],
  ["目标与计划", "Goals", "/studio/goals", "02"],
  ["学习进度", "Study", "/studio/study", "03"],
  ["成长收件箱", "Inbox", "/studio/inbox", "04"],
  ["项目管理", "Projects", "/studio/projects", "05"],
  ["经历成果", "Archive", "/studio/archive", "06"],
  ["AI 复盘", "AI Review", "/studio/review", "07"],
  ["设置", "Settings", "/studio/settings", "08"],
  ["使用指南", "Guide", "/studio/guide", "09"],
] as const;

export const studyTracks = [
  { name: "数学一", note: "建立基线 · 待制定长期路线", value: 8 },
  { name: "计算机 408", note: "四科知识图谱 · 待系统评估", value: 6 },
  { name: "英语一", note: "词汇、阅读与写作长期积累", value: 12 },
  { name: "思想政治理论", note: "后期进入系统学习", value: 2 },
  { name: "技术与项目", note: "以完整项目验证学习成果", value: 15 },
] as const;
