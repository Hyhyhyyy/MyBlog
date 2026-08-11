import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveCards } from "../content";
import { PublicShell, PageHeading } from "../components/public-shell";
import { Reveal, TiltCard } from "../components/motion";
import { getPosts } from "../../lib/posts";
import { getProjects, getGeneratedAt } from "../../lib/projects";

const valid = ["projects", "notes", "collections", "about"];

function repoInitials(name: string): string {
  const parts = name.split(/[-_\s]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!valid.includes(section)) notFound();

  const content = await renderSection(section);
  return (
    <PublicShell active={section}>
      <main className="public-page">{content}</main>
    </PublicShell>
  );
}

async function renderSection(section: string) {
  if (section === "projects") {
    const projects = await getProjects();
    const generatedAt = await getGeneratedAt();
    const featured = projects[0];
    const rest = projects.slice(1);
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
        {projects.length === 0 ? (
          <Reveal as="section" className="project-empty">
            <p className="eyebrow">SNAPSHOT · 待填充</p>
            <h2>公开仓库信息将在刷新后自动出现</h2>
            <p>
              本项目从{" "}
              <a href="https://github.com/Hyhyhyyy" target="_blank" rel="noopener noreferrer">
                github.com/Hyhyhyyy
              </a>{" "}
              的公开仓库读取数据，以静态快照形式呈现，不依赖运行时接口。
            </p>
            <p className="project-refresh">
              在仓库根目录运行 <code>node scripts/fetch-projects.mjs</code>（可选设置{" "}
              <code>GITHUB_TOKEN</code> 提高额度）即可生成 <code>data/projects.json</code>，提交后这里会展示真实仓库。
            </p>
            <a className="text-link" href="https://github.com/Hyhyhyyy" target="_blank" rel="noopener noreferrer">
              前往 GitHub 主页 →
            </a>
          </Reveal>
        ) : (
          <>
            {featured && (
              <Reveal as="section" className="featured-project">
                <div>
                  <p className="eyebrow">CURRENT PROJECT · {featured.language || "REPO"}</p>
                  <h2>{featured.name}</h2>
                  <p>{featured.description || "暂无描述。"}</p>
                  <div className="paper-tags">
                    {featured.topics.length
                      ? featured.topics.slice(0, 5).map((t) => <span key={t}>{t}</span>)
                      : <span>{featured.language || "Repository"}</span>}
                  </div>
                  <Link className="text-link" href={`/projects/${featured.slug}`}>
                    阅读项目档案 →
                  </Link>
                </div>
                <TiltCard className="poster-tilt">
                  <div className="project-poster">
                    <small>PROJECT FILE / 001</small>
                    <strong>{repoInitials(featured.name)}</strong>
                    <span>{(featured.topics[0] || "REPO").toUpperCase()}</span>
                  </div>
                </TiltCard>
              </Reveal>
            )}
            {rest.length > 0 && (
              <Reveal as="section" className="project-grid">
                {rest.map((p) => (
                  <article key={p.slug}>
                    <span className="status private">{p.language || "REPO"}</span>
                    <h3>{p.name}</h3>
                    <p>{p.description || "暂无描述。"}</p>
                    <Link className="text-link" href={`/projects/${p.slug}`}>
                      查看档案 →
                    </Link>
                  </article>
                ))}
              </Reveal>
            )}
          </>
        )}
        {generatedAt && (
          <p className="project-snapshot-time">
            数据快照生成于 {new Date(generatedAt).toLocaleDateString("zh-CN")}
          </p>
        )}
      </>
    );
  }

  if (section === "notes") {
    const posts = await getPosts("notes");
    const tags = Array.from(new Set(posts.flatMap((p) => p.tags)));
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
            <h3>标签</h3>
            <div className="paper-tags">
              {tags.length ? tags.map((t) => <span key={t}>{t}</span>) : <span>暂无</span>}
            </div>
          </aside>
          <div className="notes-list">
            {posts.length === 0 && (
              <article className="empty-note">
                <span>＋</span>
                <h3>第一篇公开知识笔记尚待写下</h3>
                <p>在 content/posts 中以 Markdown 添加，构建时会自动生成这里。</p>
              </article>
            )}
            {posts.map((post) => (
              <Link className="notes-card" href={`/notes/${post.slug}`} key={post.slug}>
                <p className="eyebrow">{post.date}</p>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <small>{post.tags.join(" · ")}</small>
              </Link>
            ))}
          </div>
        </Reveal>
      </>
    );
  }

  if (section === "collections") {
    const posts = await getPosts("collections");
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
            <button className="outline-button" type="button">查看收藏规则</button>
          </div>
        </Reveal>
        <Reveal as="section" className="notes-list collection-list">
          {posts.length === 0 && (
            <article className="empty-note">
              <span>＋</span>
              <h3>第一条收藏尚待写下</h3>
              <p>在 content/posts 中以 category: collections 添加，构建时会自动生成这里。</p>
            </article>
          )}
          {posts.map((post) => (
            <Link className="notes-card" href={`/collections/${post.slug}`} key={post.slug}>
              <p className="eyebrow">{post.date}</p>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <small>{post.tags.join(" · ")}</small>
            </Link>
          ))}
        </Reveal>
      </>
    );
  }

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
          <p>初高中成长经历 · 内容已整理后公开</p>
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
