import type { Metadata } from "next";
import { commitTitle, formatDate, timeAgo } from "@/lib/format";
import { REPO } from "@/lib/config";
import { getRecentChanges, storeMode } from "@/lib/store";

export const metadata: Metadata = { title: "Recent changes" };

export default async function Recent() {
  const changes = await getRecentChanges(60);
  const byDay = new Map<string, typeof changes>();
  for (const c of changes) {
    const day = new Date(c.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    byDay.set(day, [...(byDay.get(day) ?? []), c]);
  }
  return (
    <article className="article">
      <h1 className="page-title">Recent changes</h1>
      <p className="muted">
        Every edit to the registry is a commit to <a href={`https://github.com/${REPO}/commits`} target="_blank" rel="noreferrer">{REPO}</a>.
      </p>
      {storeMode() !== "github" && <div className="notice notice-info">Recent changes are read from GitHub. Set <code>GITHUB_TOKEN</code> to enable them.</div>}
      {[...byDay.entries()].map(([day, list]) => (
        <section key={day}>
          <h2 className="day-heading">{day}</h2>
          <ul className="history">
            {list.map((c) => (
              <li key={c.sha}>
                <time title={formatDate(c.date)}>{new Date(c.date).toISOString().slice(11, 16)}</time>
                <span className="history-user">
                  {c.avatar && <img src={c.avatar} alt="" width={18} height={18} className="avatar" />}
                  {c.login || c.author}
                </span>
                <span className="history-msg">{commitTitle(c.message)}</span>
                <a className="muted small" href={c.url} target="_blank" rel="noreferrer">{c.sha.slice(0, 7)} ↗</a>
                <span className="muted small hide-sm">{timeAgo(c.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
