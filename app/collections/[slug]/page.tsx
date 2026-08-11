import { notFound } from "next/navigation";
import { getPost, getPosts } from "../../../lib/posts";
import { PublicShell } from "../../components/public-shell";
import { PostArticle } from "../../components/post-article";

export async function generateStaticParams() {
  const posts = await getPosts("collections");
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function CollectionPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post || post.category !== "collections") notFound();

  return (
    <PublicShell active="collections">
      <main className="public-page">{<PostArticle post={post} />}</main>
    </PublicShell>
  );
}
