import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { MAIN_ARTICLE, SITE_NAME } from "@/lib/config";
import { commitTitle, timeAgo } from "@/lib/format";
import { renderInline } from "@/lib/markdown";
import { wordCount } from "@/lib/page";
import { categoryHref } from "@/lib/slug";
import { getRecentChanges, listPages } from "@/lib/store";

export default async function MainPage() {
  const [pages, recent, viewer] = await Promise.all([listPages(), getRecentChanges(8), getViewer()]);
  const existing = new Set(pages.map((p) => p.slug));
  const featured = pages.find((p) => p.featured) ?? pages.find((p) => p.slug === MAIN_ARTICLE);
  const categories = new Map<string, number>();
  pages.forEach((p) => p.categories.forEach((c) => categories.set(c, (categories.get(c) ?? 0) + 1)));
  const words = pages.reduce((n, p) => n + wordCount(p.body), 0);
  const facts = pages.flatMap((p) => p.facts.map((f) => ({ f, slug: p.slug })));
  const shownFacts = facts.sort(() => Math.random() - 0.5).slice(0, 5);
  const editors = new Set(recent.map((r) => r.login || r.author)).size;

  return (
    <div className="mainpage">
      <section className="hero">
        <div>
          <p className="eyebrow">Welcome to</p>
          <h1>{SITE_NAME}</h1>
          <p className="hero-lede">
            The definitive, source-backed encyclopedia of <Link href={`/wiki/${MAIN_ARTICLE}`}>Tom Pearl</Link> — life, work, people, places and moments, all in one
            carefully maintained registry.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href={`/wiki/${MAIN_ARTICLE}`}>Read the main article</Link>
            <Link className="btn" href="/wiki/timeline">Explore the timeline</Link>
            {viewer?.isEditor && <Link className="btn" href="/new">+ New page</Link>}
          </div>
        </div>
        <dl className="stats">
          <div><dt>Articles</dt><dd>{pages.length}</dd></div>
          <div><dt>Categories</dt><dd>{categories.size}</dd></div>
          <div><dt>Words</dt><dd>{words.toLocaleString()}</dd></div>
          <div><dt>Editors</dt><dd>{Math.max(editors, 1)}</dd></div>
        </dl>
      </section>

      <div className="mp-grid">
        <section className="mp-card mp-featured">
          <h2>Featured article</h2>
          {featured ? (
            <>
              <h3><Link href={`/wiki/${featured.slug}`}>{featured.title}</Link></h3>
              {featured.summary && <p className="muted">{featured.summary}</p>}
              <p>{excerpt(featured.body)}</p>
              <Link href={`/wiki/${featured.slug}`}>Continue reading →</Link>
            </>
          ) : (
            <p className="muted">No featured article yet.</p>
          )}
        </section>

        <section className="mp-card">
          <h2>Did you know…</h2>
          {shownFacts.length ? (
            <ul className="dyk">
              {shownFacts.map(({ f, slug }) => (
                <li key={f}>
                  <span dangerouslySetInnerHTML={{ __html: renderInline(f, existing) }} />{" "}
                  <Link className="small" href={`/wiki/${slug}`}>(more)</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Facts appear here once editors add them to articles (Editor → “Main page options”).
            </p>
          )}
        </section>

        <section className="mp-card">
          <h2>Browse by category</h2>
          <ul className="cat-cloud">
            {[...categories.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => (
              <li key={c}><Link href={categoryHref(c)}>{c} <span className="count">{n}</span></Link></li>
            ))}
          </ul>
        </section>

        <section className="mp-card">
          <h2>Recently updated</h2>
          {recent.length ? (
            <ul className="recent-list">
              {recent.map((r) => (
                <li key={r.sha}>
                  {r.avatar && <img src={r.avatar} alt="" width={18} height={18} className="avatar" />}
                  <span>{commitTitle(r.message)}</span>
                  <span className="muted small">{timeAgo(r.date)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="recent-list">
              {pages.slice(0, 8).map((p) => (
                <li key={p.slug}><Link href={`/wiki/${p.slug}`}>{p.title}</Link></li>
              ))}
            </ul>
          )}
          <Link className="small" href="/recent">All recent changes →</Link>
        </section>

        <section className="mp-card mp-wide">
          <h2>Explore the registry</h2>
          <div className="tile-grid">
            {pages.filter((p) => !p.categories.includes("Registry")).map((p) => (
              <Link key={p.slug} href={`/wiki/${p.slug}`} className="tile">
                <strong>{p.title}</strong>
                <span>{p.summary || "Read more"}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function excerpt(body: string): string {
  const para = body
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .find((s) => s && !s.startsWith("#") && !s.startsWith("{{") && !s.startsWith("|") && !s.startsWith(">"));
  if (!para) return "";
  const text = para.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, l) => l || t).replace(/\[\^[^\]]+\]/g, "").replace(/[*_`]/g, "");
  return text.length > 420 ? text.slice(0, 420).replace(/\s\S*$/, "") + "…" : text;
}
