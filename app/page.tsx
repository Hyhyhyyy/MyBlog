import Link from "next/link";
import { archiveCards } from "./content";
import { Localized, PublicShell } from "./components/public-shell";
import { InteractiveIndexTabs, PullBookmark, QuoteDrawer } from "./components/interactions";
import { Reveal, Magnetic, ScrollProgress, Spotlight, TextGenerate, AnimatedNumber } from "./components/motion";

export default function Home() {
  return (
    <PublicShell>
      <ScrollProgress />
      <main>
        <section className="home-hero">
          <div className="hero-copy reveal-1">
            <Spotlight className="hero-spotlight">
              <p className="eyebrow">PERSONAL GROWTH ARCHIVE · 2029</p>
              <h1>Hyhyhyyy</h1>
              <p className="profile-line">大连理工大学计算机类 · 2029</p>
              <i className="red-rule" />
              <h2 className="bilingual-hero">
                <span><TextGenerate text="敬，真相与自由！" /></span>
                <small>TO TRUTH AND FREEDOM.</small>
              </h2>
              <Magnetic>
                <Link className="vermilion-button" href="/timeline">
                  <Localized zh="翻阅成长档案" en="Explore the Archive" /> <span>→</span>
                </Link>
              </Magnetic>
              <p className="hero-footnote">
                <Localized zh="把走过的路，编成可翻阅的页。" en="Binding the road travelled into pages worth revisiting." />
              </p>
            </Spotlight>
          </div>
          <div className="archive-object reveal-2" aria-label="私人藏书票视觉装置">
            <p className="margin-note note-top">这里记录着<br />反复思考过的瞬间。</p>
            <div className="paper back-one" />
            <div className="paper back-two" />
            <div className="paper main-paper">
              <small>GROWTH ARCHIVE<br />PERSONAL LIBRARY</small>
              <strong>HY</strong>
              <em>EX LIBRIS</em>
              <span className="seal">HY</span>
            </div>
            <PullBookmark />
            <InteractiveIndexTabs />
            <div className="chapter-rail">
              <span>CHAPTER</span>
              <b>01</b>
              <i className="current" />
              <i />
              <i />
              <small>04</small>
            </div>
            <QuoteDrawer />
            <p className="margin-note note-bottom">悬停可见批注。</p>
          </div>
        </section>
        <Reveal as="section" className="archive-index">
          {archiveCards.map((card) => (
            <Link className="archive-card" href={card.href} key={card.no}>
              <i className="card-sheen" aria-hidden="true" />
              <small>NO. {card.no}</small>
              <div className={`card-mark ${card.tone}`}>{card.mark}</div>
              <div>
                <h3 className="card-bilingual-title">
                  <span>{card.title}</span>
                  <small>{card.titleEn}</small>
                </h3>
                <i />
                <p>
                  <Localized zh={card.body} en={card.bodyEn} />
                </p>
              </div>
              <span>→</span>
            </Link>
          ))}
        </Reveal>
        <Reveal as="section" className="act-intro">
          <div>
            <p className="eyebrow">ACT I · SCENE 01</p>
            <h2>成长不是一张完成表，<br />而是一部仍在书写的长篇。</h2>
          </div>
          <p>
            公开页面呈现已经确认的作品、经历与思考；未完成的目标、学习进度与私人复盘留在工作台。每一条记录都能在未来成为项目时间线、文章素材或阶段成果。
          </p>
        </Reveal>
        <Reveal as="section" className="stat-band">
          <div className="stat">
            <AnimatedNumber className="stat-value" value={5} />
            <span className="stat-label">成长档案章节</span>
          </div>
          <div className="stat">
            <AnimatedNumber className="stat-value" value={2029} />
            <span className="stat-label">书写起点</span>
          </div>
          <div className="stat">
            <AnimatedNumber className="stat-value" value={100} suffix="%" />
            <span className="stat-label">原始数据保留</span>
          </div>
          <div className="stat">
            <span className="stat-value">∞</span>
            <span className="stat-label">持续书写</span>
          </div>
        </Reveal>
      </main>
    </PublicShell>
  );
}
