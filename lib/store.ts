import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { revalidateTag } from "next/cache";
import { BRANCH, CONTENT_DIR, REPO } from "./config";
import { parsePage, type Page } from "./page";

/**
 * Content store.
 *
 * - "github" mode (GITHUB_TOKEN set): pages are read live from the repository through the
 *   GitHub API and every save is a real commit, so the repo *is* the database and every
 *   edit has full history.
 * - "local" mode (no token): pages are read from ./content/pages. In `next dev` saves write
 *   to disk; in production the registry is read-only.
 */

export interface Revision {
  sha: string;
  message: string;
  author: string;
  login: string | null;
  avatar: string | null;
  date: string;
  url: string;
}

export interface Author {
  name: string;
  login: string;
  id?: string | number;
}

const TAG = "registry-content";
const TOKEN = process.env.GITHUB_TOKEN || "";

export type StoreMode = "github" | "local";
export const storeMode = (): StoreMode => (TOKEN ? "github" : "local");
export const canWrite = (): boolean => storeMode() === "github" || process.env.NODE_ENV === "development";

const filePath = (slug: string) => `${CONTENT_DIR}/${slug}.md`;
const localPath = (slug: string) => path.join(process.cwd(), CONTENT_DIR, `${slug}.md`);

// ───────────────────────────── GitHub helpers ─────────────────────────────

async function gh<T>(url: string, init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {}): Promise<T> {
  const res = await fetch(`https://api.github.com${url}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pearl-registry",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`GitHub API ${res.status} on ${url}: ${text.slice(0, 300)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

const b64decode = (s: string) => Buffer.from(s, "base64").toString("utf8");
const b64encode = (s: string) => Buffer.from(s, "utf8").toString("base64");

interface DirEntry {
  name: string;
  path: string;
  sha: string;
  type: string;
}

async function ghListFiles(): Promise<DirEntry[]> {
  try {
    const entries = await gh<DirEntry[]>(`/repos/${REPO}/contents/${CONTENT_DIR}?ref=${encodeURIComponent(BRANCH)}`, {
      next: { revalidate: 30, tags: [TAG] },
    });
    return entries.filter((e) => e.type === "file" && e.name.endsWith(".md"));
  } catch (e) {
    if ((e as { status?: number }).status === 404) return [];
    throw e;
  }
}

/** Blobs are content-addressed, so they can be cached forever. */
async function ghBlob(sha: string): Promise<string> {
  const blob = await gh<{ content: string }>(`/repos/${REPO}/git/blobs/${sha}`, { cache: "force-cache" });
  return b64decode(blob.content);
}

// ───────────────────────────── Reading ─────────────────────────────

export async function listPages(): Promise<Page[]> {
  if (storeMode() === "github") {
    try {
      const files = await ghListFiles();
      const pages = await Promise.all(
        files.map(async (f) => parsePage(f.name.replace(/\.md$/, ""), await ghBlob(f.sha), f.sha)),
      );
      return pages.sort((a, b) => a.title.localeCompare(b.title));
    } catch (e) {
      // Keep the registry readable if GitHub is down or the token is wrong.
      console.error("[registry] GitHub read failed; serving bundled content.", (e as Error).message);
    }
  }
  return listLocalPages();
}

async function listLocalPages(): Promise<Page[]> {
  const dir = path.join(process.cwd(), CONTENT_DIR);
  let names: string[] = [];
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith(".md"));
  } catch {
    return [];
  }
  const pages = await Promise.all(
    names.map(async (n) => parsePage(n.replace(/\.md$/, ""), await fs.readFile(path.join(dir, n), "utf8"))),
  );
  return pages.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getPage(slug: string): Promise<Page | null> {
  const pages = await listPages();
  return pages.find((p) => p.slug === slug) ?? null;
}

/** Resolve a slug that may be an alias of another page. */
export async function resolvePage(slug: string): Promise<{ page: Page | null; redirectedFrom?: string }> {
  const pages = await listPages();
  const direct = pages.find((p) => p.slug === slug);
  if (direct) return { page: direct };
  const { slugify } = await import("./slug");
  const viaAlias = pages.find((p) => p.aliases.some((a) => slugify(a) === slug));
  return viaAlias ? { page: viaAlias, redirectedFrom: slug } : { page: null };
}

// ───────────────────────────── History ─────────────────────────────

interface GhCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author: { name: string; date: string } };
  author: { login: string; avatar_url: string } | null;
}

function toRevision(c: GhCommit): Revision {
  return {
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author.name,
    login: c.author?.login ?? null,
    avatar: c.author?.avatar_url ?? null,
    date: c.commit.author.date,
    url: c.html_url,
  };
}

export async function getHistory(slug: string, limit = 50): Promise<Revision[]> {
  if (storeMode() !== "github") return [];
  const commits = await gh<GhCommit[]>(
    `/repos/${REPO}/commits?sha=${encodeURIComponent(BRANCH)}&path=${encodeURIComponent(filePath(slug))}&per_page=${limit}`,
    { next: { revalidate: 30, tags: [TAG] } },
  );
  return commits.map(toRevision);
}

export async function getRecentChanges(limit = 40): Promise<Revision[]> {
  if (storeMode() !== "github") return [];
  try {
    const commits = await gh<GhCommit[]>(
      `/repos/${REPO}/commits?sha=${encodeURIComponent(BRANCH)}&path=${encodeURIComponent(CONTENT_DIR)}&per_page=${limit}`,
      { next: { revalidate: 30, tags: [TAG] } },
    );
    return commits.map(toRevision);
  } catch {
    return [];
  }
}

/** The raw file content of a page at a given commit (null if it didn't exist then). */
export async function getRevision(slug: string, sha: string): Promise<string | null> {
  if (storeMode() !== "github" || !/^[0-9a-f]{7,40}$/i.test(sha)) return null;
  try {
    const file = await gh<{ content: string }>(`/repos/${REPO}/contents/${filePath(slug)}?ref=${sha}`, { cache: "force-cache" });
    return b64decode(file.content);
  } catch {
    return null;
  }
}

// ───────────────────────────── Writing ─────────────────────────────

export class ConflictError extends Error {}

export async function savePage(opts: {
  slug: string;
  raw: string;
  message: string;
  author: Author;
  /** Blob sha the editor started from; used to detect edit conflicts. Omit when creating. */
  baseSha?: string;
  create?: boolean;
}): Promise<{ sha?: string }> {
  const { slug, raw, message, author, baseSha, create } = opts;

  if (storeMode() === "github") {
    const current = (await ghListFiles()).find((f) => f.name === `${slug}.md`);
    if (create && current) throw new ConflictError("A page with that name already exists.");
    if (!create && current && baseSha && current.sha !== baseSha)
      throw new ConflictError("This page was changed since you started editing. Copy your text, reload, and re-apply your edit.");
    const res = await gh<{ content: { sha: string } }>(`/repos/${REPO}/contents/${filePath(slug)}`, {
      method: "PUT",
      cache: "no-store",
      body: JSON.stringify({
        message,
        content: b64encode(raw),
        branch: BRANCH,
        ...(current ? { sha: current.sha } : {}),
        author: {
          name: author.name || author.login,
          email: author.id ? `${author.id}+${author.login}@users.noreply.github.com` : `${author.login}@users.noreply.github.com`,
        },
      }),
    });
    revalidateTag(TAG);
    return { sha: res.content.sha };
  }

  if (!canWrite()) throw new Error("The registry is read-only: set GITHUB_TOKEN to enable editing in production.");
  const p = localPath(slug);
  const exists = await fs.stat(p).then(() => true, () => false);
  if (create && exists) throw new ConflictError("A page with that name already exists.");
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, raw, "utf8");
  return {};
}

export async function deletePage(opts: { slug: string; message: string; author: Author }): Promise<void> {
  const { slug, message, author } = opts;
  if (storeMode() === "github") {
    const current = (await ghListFiles()).find((f) => f.name === `${slug}.md`);
    if (!current) return;
    await gh(`/repos/${REPO}/contents/${filePath(slug)}`, {
      method: "DELETE",
      cache: "no-store",
      body: JSON.stringify({
        message,
        sha: current.sha,
        branch: BRANCH,
        author: {
          name: author.name || author.login,
          email: author.id ? `${author.id}+${author.login}@users.noreply.github.com` : `${author.login}@users.noreply.github.com`,
        },
      }),
    });
    revalidateTag(TAG);
    return;
  }
  if (!canWrite()) throw new Error("The registry is read-only.");
  await fs.unlink(localPath(slug)).catch(() => undefined);
}
