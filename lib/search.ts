import { escapeHtml } from "./markdown";
import { plainText, type Page } from "./page";

export interface SearchHit {
  slug: string;
  title: string;
  summary: string;
  snippet: string;
  score: number;
  categories: string[];
}

const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);

function snippet(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  const start = Math.max(0, at === -1 ? 0 : at - 70);
  const raw = (start > 0 ? "…" : "") + text.slice(start, start + 220) + (text.length > start + 220 ? "…" : "");
  let html = escapeHtml(raw);
  for (const t of terms) {
    html = html.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");
  }
  return html;
}

export function searchPages(pages: Page[], query: string, limit = 50): SearchHit[] {
  const terms = tokenize(query);
  if (!terms.length) return [];
  const phrase = query.trim().toLowerCase();
  const hits: SearchHit[] = [];
  for (const p of pages) {
    const title = p.title.toLowerCase();
    const aliases = p.aliases.join(" ").toLowerCase();
    const cats = p.categories.join(" ").toLowerCase();
    const summary = p.summary.toLowerCase();
    const body = plainText(p.body);
    const bodyLower = body.toLowerCase();
    const info = Object.entries(p.infobox).map(([k, v]) => `${k} ${v}`).join(" ").toLowerCase();
    let score = 0;
    let matchedAll = true;
    for (const t of terms) {
      let s = 0;
      if (title.includes(t)) s += title.split(/\W+/).includes(t) ? 12 : 8;
      if (aliases.includes(t)) s += 7;
      if (cats.includes(t)) s += 4;
      if (summary.includes(t)) s += 3;
      if (info.includes(t)) s += 3;
      const occurrences = bodyLower.split(t).length - 1;
      s += Math.min(occurrences, 10) * 0.6;
      if (s === 0) matchedAll = false;
      score += s;
    }
    if (!score) continue;
    if (matchedAll) score *= 1.5;
    if (title === phrase) score += 40;
    else if (title.startsWith(phrase)) score += 15;
    if (bodyLower.includes(phrase) && terms.length > 1) score += 6;
    hits.push({
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      categories: p.categories,
      snippet: snippet(body || p.summary, terms),
      score,
    });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
