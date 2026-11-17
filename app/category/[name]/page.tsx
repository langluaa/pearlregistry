import type { Metadata } from "next";
import Link from "next/link";
import { listPages } from "@/lib/store";

type Params = { params: { name: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `Category: ${decodeURIComponent(params.name)}` };
}

export default async function CategoryPage({ params }: Params) {
  const name = decodeURIComponent(params.name);
  const pages = (await listPages()).filter((p) => p.categories.some((c) => c.toLowerCase() === name.toLowerCase()));
  return (
    <article className="article">
      <p className="eyebrow">Category</p>
      <h1 className="page-title">{name}</h1>
      <p className="muted">
        {pages.length} page{pages.length === 1 ? "" : "s"} in this category. <Link href="/categories">All categories</Link>
      </p>
      {pages.length ? (
        <div className="card-grid">
          {pages.map((p) => (
            <Link key={p.slug} href={`/wiki/${p.slug}`} className="tile">
              <strong>{p.title}</strong>
              <span>{p.summary || " "}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p>No pages are in this category yet.</p>
      )}
    </article>
  );
}
