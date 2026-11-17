import type { Metadata } from "next";
import Link from "next/link";
import { extractLinks } from "@/lib/markdown";
import { titleFromSlug } from "@/lib/slug";
import { listPages } from "@/lib/store";

export const metadata: Metadata = { title: "Wanted pages" };

export default async function Wanted() {
  const pages = await listPages();
  const existing = new Set(pages.map((p) => p.slug));
  const wanted = new Map<string, string[]>();
  for (const p of pages) for (const s of extractLinks(p.body)) if (!existing.has(s)) wanted.set(s, [...(wanted.get(s) ?? []), p.title]);
  const orphans = pages.filter((p) => !pages.some((o) => o.slug !== p.slug && extractLinks(o.body).includes(p.slug)));
  return (
    <article className="article">
      <h1 className="page-title">Wanted pages</h1>
      <p className="muted">Red links: pages other articles point to that don’t exist yet. Most-wanted first.</p>
      {wanted.size ? (
        <ol>
          {[...wanted.entries()].sort((a, b) => b[1].length - a[1].length).map(([s, from]) => (
            <li key={s}>
              <Link className="wikilink new" href={`/new?title=${encodeURIComponent(titleFromSlug(s))}`}>{titleFromSlug(s)}</Link>{" "}
              <span className="muted small">({from.length} link{from.length === 1 ? "" : "s"}: {from.join(", ")})</span>
            </li>
          ))}
        </ol>
      ) : (
        <p>No wanted pages — every link points somewhere. 🎉</p>
      )}
      <h2>Orphaned pages</h2>
      <p className="muted">Pages no other article links to.</p>
      <ul>{orphans.map((p) => <li key={p.slug}><Link href={`/wiki/${p.slug}`}>{p.title}</Link></li>)}</ul>
    </article>
  );
}
