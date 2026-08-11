import { notFound } from "next/navigation";
import { getPost, getPosts } from "../../../lib/posts";
import { PublicShell } from "../../components/public-shell";
import { PostArticle } from "../../components/post-article";

export async function generateStaticParams() {
  const posts = await getPosts("notes");
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function NotePost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.category !== "notes") notFound();

  return (
    <PublicShell active="notes">
      <main className="public-page">{<PostArticle post={post} />}</main>
    </PublicShell>
  );
}
