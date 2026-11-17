import { Marked, Renderer } from "marked";
import { slugify } from "./slug";

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export interface RenderResult {
  html: string;
  toc: TocEntry[];
  /** Slugs of every page this body links to via [[wiki links]]. */
  links: string[];
}

export interface RenderOptions {
  /** Slugs that exist; links to anything else render as red "new page" links. */
  existing?: Set<string>;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Every [[wiki link]] target in a body, as slugs. */
export function extractLinks(body: string): string[] {
  const out = new Set<string>();
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const s = slugify(m[1]);
    if (s) out.add(s);
  }
  return [...out];
}

function wikiLink(target: string, label: string | undefined, existing?: Set<string>): string {
  const [page, section] = target.split("#");
  const slug = slugify(page);
  const href = `/wiki/${slug}${section ? "#" + slugify(section) : ""}`;
  const isNew = existing ? !existing.has(slug) : false;
  const text = label ?? (section ? `${page.trim()} § ${section.trim()}` : page.trim());
  return `<a href="${href}" class="wikilink${isNew ? " new" : ""}"${
    isNew ? ` title="${escapeHtml(page.trim())} (page does not exist)"` : ""
  }>${escapeHtml(text)}</a>`;
}

/**
 * Templates, written as {{name|arg}} on their own or inline:
 *   {{stub}}                      – article-is-incomplete banner
 *   {{todo|What to add}}          – editorial note banner
 *   {{main|Page title}}           – "Main article:" hatnote
 *   {{see also|A|B}}              – "See also:" hatnote
 *   {{citation needed}}           – inline superscript
 *   {{quote|Text|Attribution}}    – pull quote
 */
function renderTemplate(name: string, args: string[], existing?: Set<string>): string {
  const n = name.trim().toLowerCase();
  switch (n) {
    case "stub":
      return `<div class="ambox ambox-stub"><span class="ambox-icon" aria-hidden="true">✎</span><div><strong>This article is a stub.</strong> The registry doesn't have verified information here yet. If you're an editor, you can help by <a href="#edit-this-page" class="js-edit-link">expanding it</a>.</div></div>`;
    case "todo":
      return `<div class="ambox ambox-todo"><span class="ambox-icon" aria-hidden="true">☐</span><div><strong>To do:</strong> ${escapeHtml(args.join("|") || "This section needs work.")}</div></div>`;
    case "main":
      return `<div class="hatnote">Main article${args.length > 1 ? "s" : ""}: ${args
        .map((a) => wikiLink(a, undefined, existing))
        .join(", ")}</div>`;
    case "see also":
      return `<div class="hatnote">See also: ${args.map((a) => wikiLink(a, undefined, existing)).join(", ")}</div>`;
    case "citation needed":
    case "cn":
      return `<sup class="noprint cn">[<a href="/wiki/editing-guide#citations"><i>citation needed</i></a>]</sup>`;
    case "quote":
      return `<blockquote class="pullquote"><p>${escapeHtml(args[0] || "")}</p>${
        args[1] ? `<footer>— ${escapeHtml(args[1])}</footer>` : ""
      }</blockquote>`;
    default:
      return `<span class="template-unknown" title="Unknown template">{{${escapeHtml(name)}}}</span>`;
  }
}

export function renderMarkdown(body: string, opts: RenderOptions = {}): RenderResult {
  const { existing } = opts;
  const toc: TocEntry[] = [];
  const usedIds = new Map<string, number>();

  // 1. Protect code so wiki syntax inside it is left alone.
  const stash: string[] = [];
  let src = body.replace(/```[\s\S]*?```|`[^`\n]+`/g, (m) => {
    stash.push(m);
    return `\u0000${stash.length - 1}\u0000`;
  });

  // 2. Footnote definitions:  [^id]: text
  const defs = new Map<string, string>();
  src = src.replace(/^\[\^([^\]\s]+)\]:[ \t]*(.+)$/gm, (_, id: string, text: string) => {
    defs.set(id, text);
    return "";
  });

  // 3. Footnote references:  [^id]
  const order: string[] = [];
  src = src.replace(/\[\^([^\]\s]+)\]/g, (_, id: string) => {
    let n = order.indexOf(id);
    if (n === -1) {
      order.push(id);
      n = order.length - 1;
    }
    return `<sup class="reference" id="cite-ref-${escapeHtml(id)}"><a href="#cite-note-${escapeHtml(id)}">[${n + 1}]</a></sup>`;
  });

  // 4. Templates and wiki links.
  src = src.replace(/\{\{([^{}|]+)((?:\|[^{}]*)?)\}\}/g, (_, name: string, rest: string) =>
    renderTemplate(name, rest ? rest.slice(1).split("|").map((s) => s.trim()) : [], existing),
  );
  src = src.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t: string, l?: string) => wikiLink(t, l, existing));

  // 5. Restore code.
  src = src.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]);

  // 6. Markdown with heading anchors and safe external links.
  const renderer = new Renderer();
  renderer.heading = (text: string, level: number, raw: string) => {
    const plain = raw.replace(/<[^>]+>/g, "").trim();
    const base = slugify(plain) || "section";
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    if (level === 2 || level === 3) toc.push({ id, text: plain, level });
    return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${level}>\n`;
  };
  renderer.link = (href: string, title: string | null | undefined, text: string) => {
    const external = /^https?:\/\//.test(href);
    return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}${
      external ? ' class="external" target="_blank" rel="noopener noreferrer"' : ""
    }>${text}</a>`;
  };
  renderer.table = (header: string, body: string) =>
    `<div class="table-wrap"><table class="wikitable"><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;

  const md = new Marked({ gfm: true, breaks: false, renderer });
  let html = md.parse(src, { async: false }) as string;

  // 7. Reference list.
  if (order.length) {
    const items = order
      .map((id) => {
        const text = defs.get(id);
        const content = text ? (md.parseInline(text, { async: false }) as string) : '<span class="muted">Missing reference text.</span>';
        return `<li id="cite-note-${escapeHtml(id)}"><a class="backref" href="#cite-ref-${escapeHtml(id)}" aria-label="Back to text">^</a> ${content}</li>`;
      })
      .join("");
    html += `<h2 id="references"><a class="anchor" href="#references" aria-hidden="true">#</a>References</h2><ol class="references">${items}</ol>`;
    toc.push({ id: "references", text: "References", level: 2 });
  }

  return { html, toc, links: extractLinks(body) };
}

/** Inline markdown + wiki links, for infobox values and short fields. */
export function renderInline(text: string, existing?: Set<string>): string {
  const withLinks = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t: string, l?: string) => wikiLink(t, l, existing));
  return new Marked({ gfm: true }).parseInline(withLinks, { async: false }) as string;
}
