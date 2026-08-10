import Link from "next/link";
import { publicNav } from "../content";
import { getChatGPTUser } from "../chatgpt-auth";
import { PublicUtilities } from "./interactions";

export async function PublicShell({ children, active = "" }: { children: React.ReactNode; active?: string }) {
  const user = await getChatGPTUser();
  return (
    <div className="paper-site">
      <header className="public-header">
        <Link className="brand" href="/"><b>HYHY</b><span>/</span><em>Growth Archive</em></Link>
        <nav aria-label="公开导航">
          {publicNav.map(([label, labelEn, href]) => <Link key={href} className={active === href.slice(1) ? "active" : ""} href={href}><span>{label}</span><small>{labelEn}</small></Link>)}
        </nav>
      </header>
      <PublicUtilities isAdmin={Boolean(user)} />
      {children}
      <footer className="public-footer">
        <div><span className="seal">HY</span><b>Hyhyhyyy Growth Archive</b></div>
        <p>把走过的路，编成可翻阅的页。</p>
        <div className="footer-links"><Link href="/timeline">时间线</Link><Link href="/collections">文学书架</Link><Link href="/about">关于</Link></div>
      </footer>
    </div>
  );
}

export function Localized({ zh, en, className = "" }: { zh: string; en: string; className?: string }) {
  return <span className={`translatable ${className}`}><span lang="zh">{zh}</span><span lang="en">{en}</span></span>;
}

export function PageHeading({ eyebrow, title, titleEn, intro, introEn, chapter }: { eyebrow: string; title: string; titleEn: string; intro: string; introEn: string; chapter: string }) {
  return (
    <section className="page-heading">
      <span className="folio-mark" aria-hidden="true">HY / {chapter}</span>
      <div><p className="eyebrow">{eyebrow}</p><h1 className="bilingual-title"><span>{title}</span><small>{titleEn}</small></h1><p className="lede"><Localized zh={intro} en={introEn} /></p></div>
      <div className="chapter-stamp"><span>CHAPTER</span><strong>{chapter}</strong><i /></div>
    </section>
  );
}
