import Link from "next/link";
import { AiCoach, AiIntegrationStatus, EvidenceManager, FocusTimer, InboxManager, RecordManager, SettingsControls, TodayChecklist } from "../../components/interactions";
import { StudioHeading, StudioShell } from "../../components/studio-shell";
import { campusRoles, studyTracks } from "../../content";
import { requireChatGPTUser } from "../../chatgpt-auth";

const sections = ["today", "goals", "study", "inbox", "projects", "archive", "review", "settings", "guide"];

export default async function StudioPage({ params }: { params: Promise<{ section?: string[] }> }) {
  await requireChatGPTUser("/studio");
  const { section } = await params;
  const active = section?.[0] && sections.includes(section[0]) ? section[0] : "today";
  return <StudioShell active={active}>{renderStudio(active)}</StudioShell>;
}

function renderStudio(section: string) {
  if (section === "today") return <>
    <StudioHeading kicker="THURSDAY · ACT I / SCENE 01" title="今天，从建立基线开始。" intro="先看清现在的位置，再决定下一步走多远。当前计划与记录均可手动完成，AI 接口启用后再自动调整。" />
    <section className="studio-grid today-grid">
      <article className="studio-card wide"><div className="card-title"><div><p className="eyebrow">TODAY’S PLAN</p><h2>今日计划</h2></div><span className="completion-ring">25<small>%</small></span></div><TodayChecklist /></article>
      <FocusTimer />
      <article className="studio-card"><p className="eyebrow">QUICK REVIEW</p><h3>晚间复盘</h3><p>22:30 自动提醒。AI 将询问完成情况、阻碍与明日调整。</p><span className="paper-label">尚未开始</span></article>
      <article className="studio-card wide"><AiCoach /></article>
    </section>
  </>;

  if (section === "goals") return <>
    <StudioHeading kicker="GOALS · PRIVATE" title="目标不是口号，而是可以验证的章节。" intro="长期目标保持私密，被拆分为阶段、里程碑和每日行动；完成并确认后才能转化为公开成果。" action="新建目标" />
    <section className="goal-hero"><div><p className="eyebrow">PRIMARY GOAL · 2028 ADMISSION</p><h2>北京大学软件与微电子学院 · 11408</h2><p>目标：在 2027 年中前形成接近目标要求的基本能力，再用后续阶段反复练习、验证和修正。</p><div className="paper-tags"><span>长期目标</span><span>仅管理员可见</span><span>尚未完成基线评估</span></div></div><div className="goal-seal"><small>CONFIDENCE</small><strong>—</strong><span>等待基线</span></div></section>
    <section className="act-roadmap">{[["ACT I", "奠基与评估", "现在—完成基础地图"], ["ACT II", "系统学习", "建立完整知识体系"], ["ACT III", "强化与验证", "2027 年中关键验收"], ["ACT IV", "真题与冲刺", "反复练习与稳定输出"]].map(([act, title, date], i) => <article className={i === 0 ? "current" : ""} key={act}><span>{act}</span><i /><h3>{title}</h3><p>{date}</p><button>查看里程碑 →</button></article>)}</section>
    <section className="studio-card milestone-table"><div className="card-title"><div><p className="eyebrow">CURRENT MILESTONES</p><h2>当前阶段里程碑</h2></div><button>调整阶段</button></div>{["完成数学一与 408 基线评估", "确定每周稳定学习时间", "建立错题、知识点与复盘机制", "完成第一个可展示的完整技术项目"].map((x, i) => <div key={x}><span>0{i + 1}</span><b>{x}</b><em>{i === 0 ? "本周" : "待排期"}</em></div>)}</section>
    <RecordManager category="goal" title="可编辑目标档案" empty="还没有自定义目标" />
  </>;

  if (section === "study") return <>
    <StudioHeading kicker="STUDY SYSTEM · PRIVATE" title="学习进度" intro="围绕目标建立知识地图、学习计时、练习记录和掌握度，而不是只统计投入时长。" action="记录一次学习" />
    <section className="study-summary"><article><small>本周学习</small><strong>0h</strong><span>等待首次计时</span></article><article><small>已完成任务</small><strong>1</strong><span>基础档案已建立</span></article><article><small>待评估知识点</small><strong>全部</strong><span>建议从 408 开始</span></article><article><small>连续记录</small><strong>1 day</strong><span>今天是第一天</span></article></section>
    <section className="track-list">{studyTracks.map((track, i) => <article key={track.name}><div className="track-no">0{i + 1}</div><div><h3>{track.name}</h3><p>{track.note}</p><div className="progress"><i style={{ width: `${track.value}%` }} /></div></div><span>{track.value}%</span><button>进入 →</button></article>)}</section>
    <section className="study-panels"><article className="studio-card"><p className="eyebrow">KNOWLEDGE MAP</p><h2>知识点掌握地图</h2><div className="map-placeholder"><span>完成基线测试后生成</span><i /><i /><i /></div></article><article className="studio-card"><p className="eyebrow">RECENT SESSIONS</p><h2>最近学习记录</h2><div className="clean-empty"><b>这一页还是空白</b><p>完成首次计时后，学习内容、问题和成果会出现在这里。</p><button>开始第一次学习</button></div></article></section>
    <RecordManager category="study" title="学习记录" empty="还没有学习记录" />
  </>;

  if (section === "inbox") return <>
    <StudioHeading kicker="GROWTH INBOX · MANUAL FIRST" title="成长收件箱" intro="先保证每条文字都能可靠保存、确认和归档；未来 AI 只负责整理副本，不覆盖原始记录。" />
    <InboxManager />
  </>;

  if (section === "projects") return <>
    <StudioHeading kicker="PROJECT STUDIO" title="项目管理" intro="项目计划、开发日报、材料与成果共享同一条时间线；参加竞赛或形成实习成果时，只需增加用途标签。" action="创建项目" />
    <section className="project-board"><article className="project-admin-card"><div><span className="status progress">IN PROGRESS</span><small>PROJECT 001</small></div><h2>Hyhyhyyy Growth Archive</h2><p>正在完成全站 UI 设计与可点击原型。</p><div className="progress"><i style={{ width: "35%" }} /></div><div className="project-actions"><span>最近记录：今天</span><Link href="/projects/growth-archive">查看公开档案 ↗</Link></div></article><article className="new-project"><span>＋</span><h3>记录下一个项目</h3><p>输入一句话，AI 将帮助建立目标、里程碑与日报模板。</p></article></section>
    <section className="studio-card project-log"><div className="card-title"><div><p className="eyebrow">PROJECT LOG</p><h2>项目日报与时间线</h2></div><button>写今日日报</button></div>{[["今天", "确认文学档案视觉方向", "UI / Design"], ["此前", "完成产品定位与功能架构", "Product"], ["此前", "建立个人档案与隐私边界", "Profile"]].map(([date, title, tag]) => <div key={title}><time>{date}</time><i /><section><span>{tag}</span><h3>{title}</h3><p>记录会同步到项目详情，但只有确认公开的内容才对访客可见。</p></section></div>)}</section>
    <RecordManager category="project" title="可编辑项目档案" empty="还没有自定义项目" />
  </>;

  if (section === "archive") return <>
    <StudioHeading kicker="EXPERIENCE & EVIDENCE" title="经历与成果" intro="保留事实、职责、行动、结果和证明材料；同一档案可生成时间线、项目说明或简历表述。" action="添加经历" />
    <section className="archive-toolbar"><div><button className="active">全部</button><button>学生工作</button><button>校园活动</button><button>项目</button><button>证书与成果</button></div><input placeholder="搜索经历与材料" /></section>
    <section className="experience-table">{campusRoles.map((role, i) => <article key={role}><span className="experience-no">0{i + 1}</span><div><p className="eyebrow">CAMPUS EXPERIENCE</p><h3>{role}</h3><p>信息待补充：时间 · 职责 · 事件 · 结果 · 材料</p></div><span className="status private">PRIVATE</span><button>编辑 →</button></article>)}</section>
    <RecordManager category="experience" title="可编辑经历档案" empty="还没有新增经历" />
    <RecordManager category="achievement" title="成果与证书档案" empty="还没有成果记录" />
    <EvidenceManager />
  </>;

  if (section === "review") return <>
    <StudioHeading kicker="REVIEW & SUPERVISION" title="AI 复盘助手" intro="当前先积累可信记录并完成手动复盘；模型接入后再启用追问、分析和计划重排。" />
    <section className="review-layout"><div><AiCoach /><article className="studio-card weekly-review"><p className="eyebrow">WEEKLY REVIEW · MANUAL</p><h2>本周复盘</h2><div className="review-metrics"><span><b>—</b>完成率</span><span><b>—</b>专注时长</span><span><b>4</b>待补档案</span></div><button>填写手动复盘</button></article></div><aside className="ai-thread"><div className="ai-avatar">AI</div><p className="eyebrow">PROVIDER PLACEHOLDER</p><h2>模型尚未连接</h2><p>已确定主模型 qwen3.7-plus，并为深度复盘、视觉理解、语音识别和检索保留独立路由。</p><AiIntegrationStatus /><small>配置服务端密钥前不会发送任何私人数据。</small></aside></section>
  </>;

  if (section === "guide") return <>
    <StudioHeading kicker="TRIAL MANUAL · WEB & MOBILE" title="使用指南" intro="从网页登录到安装手机 APP，再到每日记录、材料上传和数据备份，按下面顺序即可完整试用。" />
    <section className="guide-hero"><div><span>01</span><h2>先完成一次完整闭环</h2><p>进入“今日”添加任务并勾选完成 → 到“成长收件箱”保存文字或语音 → 在“经历成果”上传一份材料 → 回到设置导出备份。</p></div><aside><b>约 5 分钟</b><small>建议先用不敏感的测试内容</small></aside></section>
    <section className="guide-grid">
      {[
        ["01", "登录与进入工作台", "打开公开主页。管理员登录后，右下角会出现私人工作台入口；普通访客看不到入口，也不能访问私人接口。"],
        ["02", "今日任务", "在今日计划底部输入任务并加入计划；勾选后自动同步。删除按钮只删除该任务，不影响关联档案。"],
        ["03", "文字快速记录", "点击右下角“快速记录”，选择学习、项目、经历或成果，输入内容并保存。未提交文字会作为本机离线草稿保留。"],
        ["04", "手机语音记录", "点击语音按钮，首次允许麦克风权限；停止后原始音频自动上传并写入收件箱。未接入模型前显示“等待转写”。"],
        ["05", "收件箱整理", "使用全部、待整理、已确认、已归档筛选。确认表示事实已经核对，归档表示暂时不再处理。"],
        ["06", "材料与证据", "在经历成果页上传照片、证书、PDF或项目文件；材料默认私密，可下载核对或删除。单个文件上限20MB。"],
        ["07", "目标、学习与项目", "目标页管理长期路线；学习页查看学科结构；项目页记录项目与日报。当前静态档案将在下一轮接入统一编辑表单。"],
        ["08", "备份与迁移", "设置页选择“导出 JSON”，下载任务、记录、档案和材料元数据。原文件需要在材料库分别下载。"],
        ["09", "AI接口状态", "当前AI未启用。未来主模型为qwen3.7-plus，语音转写使用fun-asr；配置密钥前不会把记录发送到模型服务。"],
      ].map(([no, title, body]) => <article key={no}><span>{no}</span><h3>{title}</h3><p>{body}</p></article>)}
    </section>
    <section className="install-guide"><div><p className="eyebrow">INSTALL AS APP</p><h2>安装到手机主屏幕</h2></div><article><b>Android / Chrome</b><p>打开网站并登录 → 浏览器菜单 →“安装应用”或“添加到主屏幕”→ 确认。以后从桌面图标直接进入工作台。</p></article><article><b>iPhone / Safari</b><p>使用Safari打开网站并登录 → 点击分享按钮 →“添加到主屏幕”→ 添加。iOS需要从桌面图标启动才能获得完整PWA体验。</p></article><article><b>权限建议</b><p>仅在使用语音记录时允许麦克风；通知功能将在后续版本启用。不要在公共设备上保存登录状态或离线私人页面。</p></article></section>
  </>;

  return <>
    <StudioHeading kicker="SYSTEM SETTINGS" title="设置" intro="管理个人资料、隐私边界、提醒、AI 行为、数据同步与外部集成。" />
    <section className="settings-grid"><article className="studio-card profile-settings"><p className="eyebrow">PUBLIC PROFILE</p><div className="profile-avatar">HY</div><h2>Hyhyhyyy</h2><p>大连理工大学计算机类 · 2029</p><button>编辑公开资料</button><button>上传头像</button></article><article className="studio-card"><p className="eyebrow">SUPERVISION & AI</p><h2>监督与自动整理</h2><AiIntegrationStatus /><SettingsControls /></article><article className="studio-card full"><p className="eyebrow">PRIVACY DEFAULTS</p><h2>隐私与发布流程</h2><div className="privacy-flow"><span><b>01</b>新记录<br /><small>默认私密</small></span><i>→</i><span><b>02</b>手动整理<br /><small>保留原文</small></span><i>→</i><span><b>03</b>人工确认<br /><small>检查事实</small></span><i>→</i><span><b>04</b>选择公开<br /><small>进入网站</small></span></div></article><article className="studio-card full"><p className="eyebrow">SYNC & INTEGRATIONS</p><h2>同步、导出与集成</h2><div className="integration-list"><div><span>⌘</span><b>GitHub</b><small>同步公开项目与贡献</small><button>稍后连接</button></div><div><span>↗</span><b>移动端 PWA</b><small>安装、离线草稿与通知</small><button>准备配置</button></div><div><span>↓</span><b>数据备份</b><small>导出任务、记录和档案元数据</small><Link className="integration-action" href="/api/export">导出 JSON</Link></div></div></article></section>
  </>;
}
