import type { Metadata } from "next";
import Link from "next/link";
import { wordCount } from "@/lib/page";
import { listPages } from "@/lib/store";

export const metadata: Metadata = { title: "All pages" };

export default async function AllPages({ searchParams }: { searchParams: { deleted?: string } }) {
  const pages = await listPages();
  const groups = new Map<string, typeof pages>();
  for (const p of pages) {
    const letter = /[a-z]/i.test(p.title[0]) ? p.title[0].toUpperCase() : "#";
    groups.set(letter, [...(groups.get(letter) ?? []), p]);
  }
  const letters = [...groups.keys()].sort();
  return (
    <article className="article">
      <h1 className="page-title">All pages</h1>
      {searchParams.deleted && <div className="notice notice-success">“{searchParams.deleted}” was deleted.</div>}
      <p className="muted">{pages.length} articles in the registry, A–Z.</p>
      <nav className="az">{letters.map((l) => <a key={l} href={`#letter-${l}`}>{l}</a>)}</nav>
      {letters.map((l) => (
        <section key={l} id={`letter-${l}`} className="az-group">
          <h2>{l}</h2>
          <ul className="index-list">
            {groups.get(l)!.map((p) => (
              <li key={p.slug}>
                <Link href={`/wiki/${p.slug}`}>{p.title}</Link>
                {p.summary && <span className="muted"> — {p.summary}</span>}
                <span className="muted small"> · {wordCount(p.body)} words</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
