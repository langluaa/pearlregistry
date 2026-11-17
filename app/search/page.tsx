import type { Metadata } from "next";
import Link from "next/link";
import { searchPages } from "@/lib/search";
import { categoryHref } from "@/lib/slug";
import { listPages } from "@/lib/store";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const q = (searchParams.q || "").trim();
  const pages = await listPages();
  const cats = [...new Set(pages.flatMap((p) => p.categories))].sort();
  let hits = q ? searchPages(pages, q, 100) : [];
  if (searchParams.category) hits = hits.filter((h) => h.categories.includes(searchParams.category!));
  const exact = pages.find((p) => p.title.toLowerCase() === q.toLowerCase());
  return (
    <article className="article">
      <h1 className="page-title">Search</h1>
      <form className="search-form" action="/search">
        <input type="search" name="q" defaultValue={q} placeholder="Search titles, text, infoboxes…" autoFocus aria-label="Search query" />
        <select name="category" defaultValue={searchParams.category || ""} aria-label="Category filter">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-primary">Search</button>
      </form>
      {q && (
        <>
          {exact && <p>There is a page named “<Link href={`/wiki/${exact.slug}`}>{exact.title}</Link>” in the registry.</p>}
          <p className="muted">{hits.length} result{hits.length === 1 ? "" : "s"} for “{q}”.</p>
          <ul className="search-results">
            {hits.map((h) => (
              <li key={h.slug}>
                <Link href={`/wiki/${h.slug}`} className="search-title">{h.title}</Link>
                {h.summary && <div className="muted small">{h.summary}</div>}
                <p dangerouslySetInnerHTML={{ __html: h.snippet }} />
                <div className="small">{h.categories.map((c) => <Link key={c} href={categoryHref(c)} className="chip">{c}</Link>)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
