import type { Metadata } from "next";
import Link from "next/link";
import PageTabs from "@/components/PageTabs";
import { getViewer } from "@/lib/auth";
import { diffLines, withContext } from "@/lib/diff";
import { commitTitle, formatDate, timeAgo } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { parsePage } from "@/lib/page";
import { titleFromSlug } from "@/lib/slug";
import { getHistory, getPage, getRevision, listPages, storeMode } from "@/lib/store";

type Params = { params: { slug: string }; searchParams: { rev?: string; diff?: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `History of ${titleFromSlug(params.slug)}`, robots: { index: false } };
}

export default async function HistoryPage({ params, searchParams }: Params) {
  const { slug } = params;
  const [page, viewer, history] = await Promise.all([getPage(slug), getViewer(), getHistory(slug, 100).catch(() => [])]);
  const title = page?.title ?? titleFromSlug(slug);
  const canEdit = !!viewer?.isEditor;

  // ── A single old revision ──
  if (searchParams.rev) {
    const raw = await getRevision(slug, searchParams.rev);
    const idx = history.findIndex((h) => h.sha.startsWith(searchParams.rev!));
    const rev = history[idx];
    if (!raw) return <Missing slug={slug} title={title} canEdit={canEdit} />;
    const old = parsePage(slug, raw);
    const existing = new Set((await listPages()).map((p) => p.slug));
    const { html } = renderMarkdown(old.body, { existing });
    return (
      <article className="article">
        <PageTabs slug={slug} active="history" canEdit={canEdit} />
        <h1 className="page-title">{old.title}</h1>
        <div className="notice notice-warn">
          This is an old revision of this page{rev ? `, as edited by ${rev.login || rev.author} on ${formatDate(rev.date)}` : ""}. It may differ significantly from the{" "}
          <Link href={`/wiki/${slug}`}>current revision</Link>.
          <div className="rev-nav">
            {history[idx + 1] && <Link href={`?rev=${history[idx + 1].sha}`}>← Older revision</Link>}
            <Link href={`?diff=${searchParams.rev}`}>Show changes</Link>
            {idx > 0 && <Link href={`?rev=${history[idx - 1].sha}`}>Newer revision →</Link>}
          </div>
        </div>
        <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    );
  }

  // ── Diff of one revision against its parent ──
  if (searchParams.diff) {
    const idx = history.findIndex((h) => h.sha.startsWith(searchParams.diff!));
    const rev = history[idx];
    if (!rev) return <Missing slug={slug} title={title} canEdit={canEdit} />;
    const parent = history[idx + 1];
    const [after, before] = await Promise.all([getRevision(slug, rev.sha), parent ? getRevision(slug, parent.sha) : Promise.resolve("")]);
    const lines = withContext(diffLines(before ?? "", after ?? ""), 3);
    const added = lines.filter((l) => l.type === "add").length;
    const removed = lines.filter((l) => l.type === "del").length;
    return (
      <article className="article">
        <PageTabs slug={slug} active="history" canEdit={canEdit} />
        <h1 className="page-title">{title}: difference between revisions</h1>
        <div className="diff-head">
          <div>
            {parent ? (
              <>
                <strong>Revision {parent.sha.slice(0, 7)}</strong> · {formatDate(parent.date)}
                <div className="muted small">{commitTitle(parent.message)}</div>
              </>
            ) : (
              <strong>(page created)</strong>
            )}
          </div>
          <div>
            <strong>Revision {rev.sha.slice(0, 7)}</strong> · {formatDate(rev.date)} by {rev.login || rev.author}
            <div className="muted small">{commitTitle(rev.message)}</div>
          </div>
        </div>
        <p className="small">
          <span className="diff-stat-add">+{added}</span> <span className="diff-stat-del">−{removed}</span> lines ·{" "}
          <Link href={`?rev=${rev.sha}`}>View this revision</Link>
          {parent && <> · <Link href={`?diff=${parent.sha}`}>← Previous edit</Link></>}
          {idx > 0 && <> · <Link href={`?diff=${history[idx - 1].sha}`}>Next edit →</Link></>}
        </p>
        <div className="diff" role="table" aria-label="Line differences">
          {lines.map((l, i) =>
            l.type === "gap" ? (
              <div key={i} className="diff-gap">⋯ {l.count} unchanged line{l.count === 1 ? "" : "s"}</div>
            ) : (
              <div key={i} className={`diff-line diff-${l.type}`}>
                <span className="diff-num">{l.a ?? ""}</span>
                <span className="diff-num">{l.b ?? ""}</span>
                <span className="diff-sign">{l.type === "add" ? "+" : l.type === "del" ? "−" : " "}</span>
                <span className="diff-text">{l.text || " "}</span>
              </div>
            ),
          )}
        </div>
      </article>
    );
  }

  // ── Revision list ──
  return (
    <article className="article">
      <PageTabs slug={slug} active="history" canEdit={canEdit} exists={!!page} />
      <h1 className="page-title">{title}: revision history</h1>
      {storeMode() !== "github" ? (
        <div className="notice notice-info">Revision history is read from GitHub. Set <code>GITHUB_TOKEN</code> to enable it.</div>
      ) : history.length === 0 ? (
        <p className="muted">No revisions found for this page yet.</p>
      ) : (
        <ol className="history">
          {history.map((h, i) => (
            <li key={h.sha}>
              <div className="history-links">
                <Link href={`?diff=${h.sha}`}>diff</Link>
                <Link href={`?rev=${h.sha}`}>view</Link>
              </div>
              <time dateTime={h.date} title={formatDate(h.date)}>{formatDate(h.date)}</time>
              <span className="history-user">
                {h.avatar && <img src={h.avatar} alt="" width={18} height={18} className="avatar" />}
                {h.login ? <a href={`https://github.com/${h.login}`} target="_blank" rel="noreferrer">{h.login}</a> : h.author}
              </span>
              <span className="history-msg">{commitTitle(h.message)}</span>
              {i === 0 && <span className="badge">current</span>}
              {i === history.length - 1 && <span className="badge">created</span>}
              <a className="muted small" href={h.url} target="_blank" rel="noreferrer">{h.sha.slice(0, 7)} ↗</a>
              <span className="muted small hide-sm">{timeAgo(h.date)}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function Missing({ slug, title, canEdit }: { slug: string; title: string; canEdit: boolean }) {
  return (
    <article className="article">
      <PageTabs slug={slug} active="history" canEdit={canEdit} />
      <h1 className="page-title">{title}</h1>
      <div className="notice notice-warn">That revision could not be found. <Link href={`/wiki/${slug}/history`}>Back to history</Link></div>
    </article>
  );
}
