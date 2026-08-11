import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjects } from "../../../lib/projects";
import { PublicShell } from "../../components/public-shell";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const updated = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString("zh-CN")
    : "未知";

  return (
    <PublicShell active="projects">
      <main className="public-page project-detail">
        <Link className="back-link" href="/projects">
          ← 返回项目
        </Link>
        <header>
          <p className="eyebrow">PROJECT FILE · {project.language || "REPO"}</p>
          <h1>{project.name}</h1>
          <p>{project.description || "暂无描述。"}</p>
        </header>
        <section className="project-meta">
          <div>
            <small>REPO</small>
            <b>
              <a href={project.url} target="_blank" rel="noopener noreferrer">
                {project.name}
              </a>
            </b>
          </div>
          <div>
            <small>LANGUAGE</small>
            <b>{project.language || "—"}</b>
          </div>
          <div>
            <small>STARS</small>
            <b>{project.stars}</b>
          </div>
          <div>
            <small>FORKS</small>
            <b>{project.forks}</b>
          </div>
        </section>
        {project.topics.length > 0 && (
          <section className="project-story">
            <aside>
              <p>TOPICS</p>
              <span>{project.topics.length} 个标签</span>
            </aside>
            <div>
              <h2>技术栈与主题</h2>
              <div className="paper-tags">
                {project.topics.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              {project.homepage && (
                <p>
                  <a
                    className="text-link"
                    href={project.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    访问项目主页 →
                  </a>
                </p>
              )}
            </div>
          </section>
        )}
        <section className="project-scenes">
          <article className="done">
            <span>01</span>
            <h3>仓库</h3>
            <p>公开仓库，源码与提交历史可在 GitHub 查看。</p>
          </article>
          <article className="done">
            <span>02</span>
            <h3>主题</h3>
            <p>{project.topics.length ? project.topics.join("、") : "未标注主题"}</p>
          </article>
          <article className="done">
            <span>03</span>
            <h3>活跃</h3>
            <p>最近更新 {updated}</p>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}
