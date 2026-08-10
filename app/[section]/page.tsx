import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveCards, campusRoles } from "../content";
import { PublicShell, PageHeading } from "../components/public-shell";
import { TimelineScrubber } from "../components/interactions";
import { Reveal, TiltCard } from "../components/motion";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../../db";
import { records } from "../../db/schema";

const valid = ["timeline", "projects", "notes", "collections", "about"];

const CATEGORY_LABEL: Record<string, string> = {
  goal: "目标", study: "学习", project: "项目", experience: "经历", achievement: "成果", review: "复盘",
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!valid.includes(section)) notFound();

  let dbRecords: any[] = [];
  if (section === "timeline") {
    try {
      const db = await getDb();
      dbRecords = await db
        .select()
        .from(records)
        .where(eq(records.visibility, "public"))
        .orderBy(desc(records.startedAt));
    } catch {
      dbRecords = [];
    }
  }

  return (
    <PublicShell active={section}>
      <main className="public-page">{renderSection(section, dbRecords)}</main>
    </PublicShell>
  );
}

function renderSection(section: string, dbRecords: any[] = []) {
  if (section === "timeline") {
    const items = dbRecords.length
      ? dbRecords.map((r) => (
          <Reveal as="article" key={r.id}>
            <div>
              <span>RECORD</span>
              <b>{r.startedAt || "时间待补充"}</b>
            </div>
            <div>
              <p className="eyebrow">{(CATEGORY_LABEL[r.category] || r.category).toUpperCase()}</p>
              <h2>{r.title}</h2>
              <p>{r.description}</p>
              <div className="paper-tags">
                <span>{r.category}</span>
                <span>{r.status}</span>
              </div>
            </div>
          </Reveal>
        ))
      : null;
    return (
      <>
        <PageHeading
          eyebrow="ACTS & SCENES · PUBLIC ARCHIVE"
          title="成长时间线"
          titleEn="Growth Timeline"
          intro="把校园、项目与思考放回发生的时间中。拖动章节轴，预览每一幕留下的痕迹。"
          introEn="Campus life, projects and reflections returned to the moments in which they happened."
          chapter="01"
        />
        <TimelineScrubber />
        <section className="timeline-list">
          {items}
          <article className="timeline-empty">
            <div>
              <span>NEXT</span>
              <b>未完待续</b>
            </div>
            <div>
              <p className="eyebrow">THE NEXT SCENE</p>
              <h2>下一幕尚未写下</h2>
              <p>新的项目、活动、阅读与阶段成果将在管理员确认后进入这里。</p>
            </div>
          </article>
        </section>
      </>
    );
  }

  if (section === "projects")
    return (
      <>
        <PageHeading
          eyebrow="WORKS & PRACTICE"
          title="项目与作品"
          titleEn="Projects & Works"
          intro="项目不是结果陈列柜，而是问题、选择、迭代与验证共同组成的创作档案。"
          introEn="Projects are creative records of questions, choices, iteration and validation—not merely finished results."
          chapter="02"
        />
        <Reveal as="section" className="featured-project">
          <div>
            <p className="eyebrow">CURRENT PROJECT · IN PROGRESS</p>
            <h2>Hyhyhyyy Growth Archive</h2>
            <p>一个同时服务长期成长、日常学习、项目成果与公开表达的个人系统。当前正在完成信息架构与全站 UI。</p>
            <div className="paper-tags">
              <span>TypeScript</span>
              <span>PWA</span>
              <span>AI-assisted</span>
              <span>Personal OS</span>
            </div>
            <Link className="text-link" href="/projects/growth-archive">
              阅读项目档案 →
            </Link>
          </div>
          <TiltCard className="poster-tilt">
            <div className="project-poster">
              <small>PROJECT FILE / 001</small>
              <strong>GA</strong>
              <span>IDEA → SYSTEM</span>
            </div>
          </TiltCard>
        </Reveal>
        <Reveal as="section" className="project-grid">
          <article>
            <span className="status private">PRIVATE DRAFT</span>
            <h3>技术项目档案位</h3>
            <p>从成长收件箱关联项目后，日报、材料与成果会自动汇入这里。</p>
            <button>等待首次记录</button>
          </article>
          <article>
            <span className="status private">PRIVATE DRAFT</span>
            <h3>竞赛与作品档案位</h3>
            <p>项目参加竞赛或形成实习成果时，将用途作为小标题同步展示。</p>
            <button>等待首次记录</button>
          </article>
        </Reveal>
      </>
    );

  if (section === "notes")
    return (
      <>
        <PageHeading
          eyebrow="NOTEBOOK & ESSAYS"
          title="知识笔记"
          titleEn="Knowledge Notes"
          intro="阅读、课程、技术与生活中的问题，在这里经过整理、批注与重新理解。"
          introEn="Questions from reading, study, technology and life are organised, annotated and understood anew."
          chapter="03"
        />
        <Reveal as="section" className="note-layout">
          <aside>
            <p className="eyebrow">INDEX</p>
            {["全部笔记", "计算机基础", "项目开发", "阅读批注", "思考片段"].map((x, i) => (
              <button className={i === 0 ? "active" : ""} key={x}>
                {String(i + 1).padStart(2, "0")}　{x}
              </button>
            ))}
          </aside>
          <div className="notes-list">
            <article>
              <p className="eyebrow">PINNED · PERSONAL NOTE</p>
              <h2>为什么要建立一份成长档案？</h2>
              <p>不是为了把生活量化成漂亮数字，而是减少遗忘，让长期目标能够被每天真实发生的行动支撑。</p>
              <small>设计札记 · 5 分钟阅读</small>
            </article>
            <article className="empty-note">
              <span>＋</span>
              <h3>第一篇公开知识笔记尚待写下</h3>
              <p>AI 整理的内容会先进入私密草稿，确认后才会出现在这里。</p>
            </article>
          </div>
        </Reveal>
      </>
    );

  if (section === "collections")
    return (
      <>
        <PageHeading
          eyebrow="PRIVATE LIBRARY · PUBLIC SHELF"
          title="文学书架"
          titleEn="Literary Library"
          intro="喜欢的中英文小说、戏剧与影视作品，会以短摘录、个人批注和观看记忆进入这间私人阅读室。"
          introEn="Chinese and English novels, theatre and screen works enter this reading room through brief excerpts and personal notes."
          chapter="04"
        />
        <Reveal as="section" className="shelf-intro">
          <div className="ex-libris">
            <small>EX LIBRIS</small>
            <strong>HY</strong>
            <span>BOOKS · THEATRE · SCREEN</span>
          </div>
          <div>
            <h2>收藏作品，也收藏被作品照亮的瞬间。</h2>
            <p>这里不复制长篇文本、剧照或受保护的角色素材。每条收藏记录作品信息、短摘录、个人批注、发生时间与公开权限。</p>
            <button className="outline-button">查看收藏规则</button>
          </div>
        </Reveal>
        <Reveal as="section" className="shelves">
          {[
            ["小说 · NOVELS", "中英文小说阅读记录"],
            ["戏剧 · THEATRE", "剧本、舞台与音乐剧体验"],
            ["影视 · SCREEN", "电视剧与影像叙事"],
            ["句段 · EXCERPTS", "短摘录与个人批注"],
          ].map(([title, body]) => (
            <article key={title}>
              <span className="book-spine" />
              <p className="eyebrow">SHELF</p>
              <h3>{title}</h3>
              <p>{body}</p>
              <small>等待添加第一条收藏</small>
            </article>
          ))}
        </Reveal>
      </>
    );

  return (
    <>
      <PageHeading
        eyebrow="PROFILE & EDUCATION"
        title="关于 Hyhyhyyy"
        titleEn="About Hyhyhyyy"
        intro="一名来自北京海淀的大连理工大学计算机类学生，喜欢文学、戏剧、技术与真实的问题。"
        introEn="A computer science student at Dalian University of Technology from Haidian, Beijing, drawn to literature, theatre, technology and honest questions."
        chapter="05"
      />
      <Reveal as="section" className="about-grid">
        <div className="portrait-placeholder">
          <span>HY</span>
          <small>PORTRAIT<br />TO BE ADDED</small>
        </div>
        <div className="about-copy">
          <p className="eyebrow">PROFILE</p>
          <h2>敬，真相与自由！</h2>
          <dl>
            <div>
              <dt>身份</dt>
              <dd>大连理工大学计算机类 · 2029 届</dd>
            </div>
            <div>
              <dt>来自</dt>
              <dd>北京海淀</dd>
            </div>
            <div>
              <dt>性格</dt>
              <dd>ENFJ</dd>
            </div>
            <div>
              <dt>兴趣</dt>
              <dd>中英文小说、文学、戏剧、电视剧与技术创造</dd>
            </div>
          </dl>
        </div>
      </Reveal>
      <Reveal as="section" className="education-sheet">
        <p className="eyebrow">EDUCATION</p>
        <div>
          <span>现在</span>
          <h3>大连理工大学</h3>
          <p>计算机类 · 2029 届本科生</p>
        </div>
        <div>
          <span>此前</span>
          <h3>北京市十一学校</h3>
          <p>初高中成长经历 · 是否公开可在工作台调整</p>
        </div>
      </Reveal>
      <Reveal as="section" className="about-index">
        {archiveCards.map((c) => (
          <Link href={c.href} key={c.no}>
            <small>{c.no}</small>
            <b>{c.title}</b>
            <span>→</span>
          </Link>
        ))}
      </Reveal>
    </>
  );
}
