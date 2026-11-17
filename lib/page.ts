import YAML from "yaml";

export interface PageMeta {
  title: string;
  summary: string;
  categories: string[];
  aliases: string[];
  /** Ordered key → value pairs rendered in the infobox. Values support inline markdown. */
  infobox: Record<string, string>;
  /** Image URL for the infobox (e.g. /images/tom.jpg or an https URL). */
  image: string;
  imageCaption: string;
  featured: boolean;
  /** Short "Did you know…" facts surfaced on the main page. */
  facts: string[];
}

export interface Page extends PageMeta {
  slug: string;
  body: string;
  raw: string;
  sha?: string;
}

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function asStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === "string" && v.trim()) return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

export function parsePage(slug: string, raw: string, sha?: string): Page {
  let data: Record<string, unknown> = {};
  let body = raw;
  const m = raw.match(FM);
  if (m) {
    try {
      data = (YAML.parse(m[1]) as Record<string, unknown>) || {};
    } catch {
      data = {};
    }
    body = raw.slice(m[0].length);
  }
  const infoboxRaw = (data.infobox && typeof data.infobox === "object" ? data.infobox : {}) as Record<string, unknown>;
  const infobox: Record<string, string> = {};
  for (const [k, v] of Object.entries(infoboxRaw)) {
    const isHeader = /^[—-]/.test(k);
    if (!isHeader && (v === null || v === undefined || v === "")) continue;
    if (isHeader) {
      infobox[k] = "";
      continue;
    }
    infobox[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return {
    slug,
    raw,
    sha,
    body: body.replace(/^\s+/, ""),
    title: String(data.title || slug),
    summary: String(data.summary || ""),
    categories: asStringList(data.categories),
    aliases: asStringList(data.aliases),
    infobox,
    image: String(data.image || ""),
    imageCaption: String(data.imageCaption || ""),
    featured: Boolean(data.featured),
    facts: asStringList(data.facts),
  };
}

export function serializePage(meta: Partial<PageMeta> & { title: string }, body: string): string {
  const fm: Record<string, unknown> = { title: meta.title };
  if (meta.summary) fm.summary = meta.summary;
  if (meta.categories?.length) fm.categories = meta.categories;
  if (meta.aliases?.length) fm.aliases = meta.aliases;
  if (meta.image) fm.image = meta.image;
  if (meta.imageCaption) fm.imageCaption = meta.imageCaption;
  if (meta.featured) fm.featured = true;
  if (meta.infobox && Object.keys(meta.infobox).length) fm.infobox = meta.infobox;
  if (meta.facts?.length) fm.facts = meta.facts;
  const yaml = YAML.stringify(fm, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${body.trim()}\n`;
}

/** Rough markdown → plain text, for search and snippets. */
export function plainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\[\^[^\]]+\]:?.*$/gm, " ")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, t, l) => l || t)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(body: string): number {
  const t = plainText(body);
  return t ? t.split(" ").length : 0;
}
