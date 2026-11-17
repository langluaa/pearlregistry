import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import Infobox from "@/components/Infobox";
import PageTabs from "@/components/PageTabs";
import Toc from "@/components/Toc";
import { getViewer } from "@/lib/auth";
import { SITE_NAME } from "@/lib/config";
import { commitTitle, formatDate, timeAgo } from "@/lib/format";
import { extractLinks, renderMarkdown } from "@/lib/markdown";
import { wordCount } from "@/lib/page";
import { categoryHref, titleFromSlug } from "@/lib/slug";
import { getHistory, listPages, resolvePage } from "@/lib/store";

type Params = { params: { slug: string }; searchParams: { saved?: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page } = await resolvePage(params.slug);
  return page ? { title: page.title, description: page.summary || undefined } : { title: titleFromSlug(params.slug) };
}

export default async function ArticlePage({ params, searchParams }: Params) {
  const { slug } = params;
  const [{ page, redirectedFrom }, pages, viewer] = await Promise.all([resolvePage(slug), listPages(), getViewer()]);
  const canEdit = !!viewer?.isEditor;

  if (!page) {
    const title = titleFromSlug(slug);
    const linkedFrom = pages.filter((p) => extractLinks(p.body).includes(slug));
    return (
      <article className="article">
        <PageTabs slug={slug} active="read" canEdit={canEdit} exists={false} />
        <h1 className="page-title">{title}</h1>
        <div className="notice notice-warn">
          <p>
            <strong>The registry does not have an article with this exact name.</strong>
          </p>
          {canEdit ? (
            <p>
              <Link className="btn btn-primary btn-sm" href={`/new?title=${encodeURIComponent(title)}`}>Create “{title}”</Link>
            </p>
          ) : (
            <p className="muted">Only the registry owner can create pages. <Link href={`/search?q=${encodeURIComponent(title)}`}>Search for “{title}”</Link> instead.</p>
          )}
        </div>
        {linkedFrom.length > 0 && (
          <p className="muted">
            Wanted by: {linkedFrom.map((p, i) => (
              <span key={p.slug}>{i > 0 && ", "}<Link href={`/wiki/${p.slug}`}>{p.title}</Link></span>
            ))}
          </p>
        )}
      </article>
    );
  }

  const existing = new Set(pages.map((p) => p.slug));
  const { html, toc } = renderMarkdown(page.body, { existing });
  const finalHtml = html.replaceAll('href="#edit-this-page"', `href="/wiki/${page.slug}/edit"`);
  const backlinks = pages.filter((p) => p.slug !== page.slug && extractLinks(p.body).includes(page.slug));
  const history = await getHistory(page.slug, 100).catch(() => []);
  const last = history[0];
  const contributors = [...new Map(history.map((h) => [h.login || h.author, h])).values()];
  const words = wordCount(page.body);
  const readMins = Math.max(1, Math.round(words / 230));
  const url = `/wiki/${page.slug}`;
  const h = headers();
  const site = `${h.get("x-forwarded-proto") || "http"}://${h.get("host") || "localhost"}`;

  return (
    <article className="article">
      <PageTabs slug={page.slug} active="read" canEdit={canEdit} />
      {searchParams.saved && <div className="notice notice-success">Your edit was published.</div>}
      <header className="page-header">
        <h1 className="page-title">{page.title}</h1>
        <p className="page-from">From {SITE_NAME}</p>
        {redirectedFrom && <p className="muted small">(Redirected from <em>{titleFromSlug(redirectedFrom)}</em>)</p>}
        {page.summary && <p className="page-summary">{page.summary}</p>}
        <div className="page-meta">
          <span>{words.toLocaleString()} words</span>
          <span>{readMins} min read</span>
          {last && <span title={formatDate(last.date)}>Updated {timeAgo(last.date)}</span>}
          {history.length > 0 && <Link href={`${url}/history`}>{history.length} revision{history.length === 1 ? "" : "s"}</Link>}
          {backlinks.length > 0 && <Link href={`${url}/links`}>{backlinks.length} page{backlinks.length === 1 ? "" : "s"} link here</Link>}
        </div>
      </header>

      <div className="article-layout">
        <div className="article-main">
          <Infobox page={page} existing={existing} />
          <Toc toc={toc} />
          <div className="article-body" dangerouslySetInnerHTML={{ __html: finalHtml }} />

          {page.categories.length > 0 && (
            <div className="catlinks">
              <strong>Categories:</strong>
              {page.categories.map((c) => (
                <Link key={c} href={categoryHref(c)}>{c}</Link>
              ))}
            </div>
          )}

          <footer className="article-footer">
            {last ? (
              <p>
                This page was last edited on {formatDate(last.date)} by {last.login ? <a href={`https://github.com/${last.login}`} target="_blank" rel="noreferrer">{last.login}</a> : last.author}
                {" "}— “{commitTitle(last.message)}”.
              </p>
            ) : null}
            {contributors.length > 0 && (
              <div className="contributors">
                <span className="muted small">Contributors</span>
                {contributors.slice(0, 12).map((c) =>
                  c.avatar ? <img key={c.sha} src={c.avatar} alt={c.login || c.author} title={c.login || c.author} width={24} height={24} className="avatar" /> : null,
                )}
              </div>
            )}
            <details className="cite">
              <summary>Cite this page</summary>
              <p className="small muted">Use one of these formats when referencing this article elsewhere.</p>
              <dl>
                <dt>APA</dt>
                <dd>
                  <code>{SITE_NAME}. ({last ? new Date(last.date).getUTCFullYear() : "n.d."}). <i>{page.title}</i>. Retrieved from {site}{url}</code>
                </dd>
                <dt>MLA</dt>
                <dd>
                  <code>“{page.title}.” <i>{SITE_NAME}</i>, {last ? formatDate(last.date).split(",").slice(0, 2).join(",") : "n.d."}, {site}{url}.</code>
                </dd>
                {last && (
                  <>
                    <dt>Permanent link</dt>
                    <dd><Link href={`${url}/history?rev=${last.sha}`}>Revision {last.sha.slice(0, 7)}</Link></dd>
                  </>
                )}
              </dl>
            </details>
          </footer>
        </div>
      </div>
    </article>
  );
}
