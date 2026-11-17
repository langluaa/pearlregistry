import type { Metadata } from "next";
import Link from "next/link";
import PageTabs from "@/components/PageTabs";
import { getViewer } from "@/lib/auth";
import { extractLinks } from "@/lib/markdown";
import { titleFromSlug } from "@/lib/slug";
import { listPages } from "@/lib/store";

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `Pages that link to ${titleFromSlug(params.slug)}` };
}

export default async function LinksPage({ params }: Params) {
  const [pages, viewer] = await Promise.all([listPages(), getViewer()]);
  const page = pages.find((p) => p.slug === params.slug);
  const title = page?.title ?? titleFromSlug(params.slug);
  const incoming = pages.filter((p) => p.slug !== params.slug && extractLinks(p.body).includes(params.slug));
  const outgoing = page ? extractLinks(page.body) : [];
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  return (
    <article className="article">
      <PageTabs slug={params.slug} active="links" canEdit={!!viewer?.isEditor} exists={!!page} />
      <h1 className="page-title">Links: {title}</h1>
      <div className="two-col">
        <section>
          <h2>What links here ({incoming.length})</h2>
          {incoming.length ? (
            <ul>{incoming.map((p) => <li key={p.slug}><Link href={`/wiki/${p.slug}`}>{p.title}</Link></li>)}</ul>
          ) : (
            <p className="muted">No pages link to {title} yet.</p>
          )}
        </section>
        <section>
          <h2>Links from this page ({outgoing.length})</h2>
          {outgoing.length ? (
            <ul>
              {outgoing.map((s) => (
                <li key={s}>
                  <Link href={`/wiki/${s}`} className={bySlug.has(s) ? "" : "wikilink new"}>{bySlug.get(s)?.title ?? titleFromSlug(s)}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">This page doesn’t link to any other registry pages.</p>
          )}
        </section>
      </div>
    </article>
  );
}
