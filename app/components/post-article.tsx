import Link from "next/link";
import type { Post } from "../../lib/posts";

export function PostArticle({ post }: { post: Post }) {
  const backHref = post.category === "notes" ? "/notes" : "/collections";
  const backLabel = post.category === "notes" ? "返回知识笔记" : "返回文学书架";
  const meta = [post.date, ...post.tags].filter(Boolean).join("　·　");

  return (
    <article className="post-article">
      <Link className="back-link" href={backHref}>
        ← {backLabel}
      </Link>
      <p className="eyebrow">{meta}</p>
      <h1>{post.title}</h1>
      <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
