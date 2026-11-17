import type { Metadata } from "next";
import Link from "next/link";
import { categoryHref } from "@/lib/slug";
import { listPages } from "@/lib/store";

export const metadata: Metadata = { title: "Categories" };

export default async function Categories() {
  const pages = await listPages();
  const cats = new Map<string, string[]>();
  pages.forEach((p) => p.categories.forEach((c) => cats.set(c, [...(cats.get(c) ?? []), p.title])));
  const sorted = [...cats.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const uncategorized = pages.filter((p) => !p.categories.length);
  return (
    <article className="article">
      <h1 className="page-title">Categories</h1>
      <p className="muted">{sorted.length} categories organise the registry.</p>
      <div className="card-grid">
        {sorted.map(([c, titles]) => (
          <Link key={c} href={categoryHref(c)} className="tile">
            <strong>{c}</strong>
            <span>{titles.length} page{titles.length === 1 ? "" : "s"}: {titles.slice(0, 4).join(", ")}{titles.length > 4 ? "…" : ""}</span>
          </Link>
        ))}
      </div>
      {uncategorized.length > 0 && (
        <>
          <h2>Uncategorized pages</h2>
          <ul>{uncategorized.map((p) => <li key={p.slug}><Link href={`/wiki/${p.slug}`}>{p.title}</Link></li>)}</ul>
        </>
      )}
    </article>
  );
}
