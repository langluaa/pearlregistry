"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { serializePage, type PageMeta } from "@/lib/page";
import { slugify } from "@/lib/slug";

interface Props {
  /** Existing page slug; omitted when creating a new page. */
  slug?: string;
  initial: PageMeta & { body: string };
  sha?: string;
  existingSlugs: string[];
  allCategories: string[];
  modeNote?: string;
}

type Row = { id: number; key: string; value: string };
type View = "split" | "write" | "preview";

let rowId = 0;
const toRows = (o: Record<string, string>): Row[] => Object.entries(o).map(([key, value]) => ({ id: ++rowId, key, value }));
const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function Editor({ slug, initial, sha, existingSlugs, allCategories, modeNote }: Props) {
  const router = useRouter();
  const isNew = !slug;
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [categories, setCategories] = useState(initial.categories.join(", "));
  const [aliases, setAliases] = useState(initial.aliases.join(", "));
  const [image, setImage] = useState(initial.image);
  const [imageCaption, setImageCaption] = useState(initial.imageCaption);
  const [featured, setFeatured] = useState(initial.featured);
  const [facts, setFacts] = useState(initial.facts.join("\n"));
  const [rows, setRows] = useState<Row[]>(() => toRows(initial.infobox));
  const [body, setBody] = useState(initial.body);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<View>("split");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const targetSlug = slug ?? slugify(title);
  const existing = useMemo(() => new Set([...existingSlugs, targetSlug]), [existingSlugs, targetSlug]);
  const preview = useMemo(() => renderMarkdown(body, { existing }), [body, existing]);
  const slugTaken = isNew && !!targetSlug && existingSlugs.includes(targetSlug);

  // Mark dirty on any change after first render.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setDirty(true);
  }, [title, summary, categories, aliases, image, imageCaption, featured, facts, rows, body]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && !saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const buildRaw = useCallback(() => {
    const infobox: Record<string, string> = {};
    for (const r of rows) if (r.key.trim()) infobox[r.key.trim()] = r.value.trim();
    return serializePage(
      {
        title: title.trim(),
        summary: summary.trim(),
        categories: splitList(categories),
        aliases: splitList(aliases),
        image: image.trim(),
        imageCaption: imageCaption.trim(),
        featured,
        infobox,
        facts: facts.split("\n").map((f) => f.trim()).filter(Boolean),
      },
      body,
    );
  }, [title, summary, categories, aliases, image, imageCaption, featured, rows, facts, body]);

  const save = useCallback(async () => {
    if (saving) return;
    setError(null);
    if (!title.trim()) return setError("Every page needs a title.");
    if (!targetSlug) return setError("The title must contain at least one letter or number.");
    if (slugTaken) return setError(`A page called “${title}” already exists.`);
    setSaving(true);
    try {
      const res = await fetch(`/api/pages/${targetSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: buildRaw(), message: message.trim(), baseSha: sha, create: isNew, title: title.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      setDirty(false);
      router.push(`/wiki/${targetSlug}?saved=1`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }, [saving, title, targetSlug, slugTaken, buildRaw, message, sha, isNew, router]);

  const remove = async () => {
    if (!slug) return;
    const answer = prompt(`Delete “${title}”? This removes the page (it stays recoverable in git history).\n\nType DELETE to confirm.`);
    if (answer !== "DELETE") return;
    setSaving(true);
    const res = await fetch(`/api/pages/${slug}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: message.trim() }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Delete failed");
      setSaving(false);
      return;
    }
    setDirty(false);
    router.push("/all?deleted=" + encodeURIComponent(title));
    router.refresh();
  };

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  /** Wrap the selection (or insert a placeholder) in the body textarea. */
  const insert = (before: string, after = "", placeholder = "") => {
    const ta = textarea.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = body.slice(s, e) || placeholder;
    const next = body.slice(0, s) + before + selected + after + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  };
  const insertLine = (text: string) => {
    const ta = textarea.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = body.lastIndexOf("\n", s - 1) + 1;
    const next = body.slice(0, lineStart) + text + body.slice(lineStart);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(lineStart + text.length, lineStart + text.length);
    });
  };
  const nextRef = () => {
    const nums = [...body.matchAll(/\[\^(\d+)\]/g)].map((m) => Number(m[1]));
    return (nums.length ? Math.max(...nums) : 0) + 1;
  };

  const tools: { label: string; title: string; run: () => void }[] = [
    { label: "B", title: "Bold", run: () => insert("**", "**", "bold text") },
    { label: "I", title: "Italic", run: () => insert("*", "*", "italic text") },
    { label: "H2", title: "Section heading", run: () => insertLine("## ") },
    { label: "H3", title: "Subsection heading", run: () => insertLine("### ") },
    { label: "[[ ]]", title: "Link to another registry page", run: () => insert("[[", "]]", "Page title") },
    { label: "🔗", title: "External link", run: () => insert("[", "](https://)", "link text") },
    {
      label: "[1]",
      title: "Add a citation (footnote)",
      run: () => {
        const n = nextRef();
        const at = textarea.current?.selectionEnd ?? body.length;
        const withMarker = body.slice(0, at) + `[^${n}]` + body.slice(at);
        setBody(withMarker.replace(/\s*$/, "") + `\n\n[^${n}]: Source description, publication, date.\n`);
      },
    },
    { label: "•", title: "Bulleted list", run: () => insertLine("- ") },
    { label: "1.", title: "Numbered list", run: () => insertLine("1. ") },
    { label: "❝", title: "Pull quote", run: () => insert("{{quote|", "|Attribution}}", "Quote text") },
    { label: "▦", title: "Table", run: () => insert("\n| Year | Event |\n| --- | --- |\n| ", " | Description |\n", "2020") },
    { label: "🖼", title: "Image", run: () => insert("![", "](/images/example.jpg)", "Caption") },
    { label: "stub", title: "Mark as incomplete", run: () => insertLine("{{stub}}\n\n") },
    { label: "cn", title: "Citation needed", run: () => insert("{{citation needed}}") },
  ];

  const categoryOptions = allCategories.filter((c) => !splitList(categories).includes(c));

  return (
    <div className="editor">
      {modeNote && <div className="notice notice-info">{modeNote}</div>}
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      <section className="editor-meta">
        <div className="field field-wide">
          <label htmlFor="ed-title">Title</label>
          <input id="ed-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" />
          <span className={`hint${slugTaken ? " hint-error" : ""}`}>
            URL: /wiki/{targetSlug || "…"}
            {slugTaken && " — already taken"}
            {!isNew && " (renaming changes the title only, not the URL)"}
          </span>
        </div>
        <div className="field field-wide">
          <label htmlFor="ed-summary">Short description</label>
          <input id="ed-summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line shown under the title and in search results" />
        </div>
        <div className="field">
          <label htmlFor="ed-cats">Categories</label>
          <input id="ed-cats" value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="People, Career" />
          {categoryOptions.length > 0 && (
            <div className="chips">
              {categoryOptions.slice(0, 10).map((c) => (
                <button type="button" key={c} className="chip" onClick={() => setCategories((v) => (v.trim() ? `${v.replace(/,\s*$/, "")}, ${c}` : c))}>
                  + {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="ed-aliases">Aliases / redirects</label>
          <input id="ed-aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Other names that should lead here" />
        </div>
      </section>

      <details className="editor-panel" open={rows.length > 0 || !!image}>
        <summary>
          Infobox <span className="muted small">({rows.length} field{rows.length === 1 ? "" : "s"})</span>
        </summary>
        <div className="editor-meta">
          <div className="field">
            <label htmlFor="ed-image">Image URL</label>
            <input id="ed-image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="/images/tom.jpg or https://…" />
          </div>
          <div className="field">
            <label htmlFor="ed-caption">Image caption</label>
            <input id="ed-caption" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} />
          </div>
        </div>
        <p className="hint">Values support **bold**, *italic* and [[wiki links]]. Start a field name with “—” to make it a section header row.</p>
        <div className="kv-rows">
          {rows.map((r, i) => (
            <div className="kv-row" key={r.id}>
              <input aria-label="Field name" value={r.key} placeholder="Field" onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, key: e.target.value } : x)))} />
              <input aria-label="Value" value={r.value} placeholder="Value" onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))} />
              <button type="button" className="btn btn-ghost btn-sm" title="Move up" disabled={i === 0} onClick={() => setRows((rs) => { const c = [...rs]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })}>↑</button>
              <button type="button" className="btn btn-ghost btn-sm" title="Move down" disabled={i === rows.length - 1} onClick={() => setRows((rs) => { const c = [...rs]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c; })}>↓</button>
              <button type="button" className="btn btn-ghost btn-sm" title="Remove" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={() => setRows((rs) => [...rs, { id: ++rowId, key: "", value: "" }])}>
            + Add field
          </button>
        </div>
      </details>

      <details className="editor-panel" open={!!facts.trim() || featured}>
        <summary>Main page options</summary>
        <label className="check">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Feature this article on the main page
        </label>
        <div className="field field-wide">
          <label htmlFor="ed-facts">“Did you know…” facts (one per line)</label>
          <textarea id="ed-facts" rows={3} value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="…that Tom Pearl …?" />
        </div>
      </details>

      <section className="editor-body">
        <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
          <div className="toolbar-group">
            {tools.map((t) => (
              <button type="button" key={t.title} className="tool" title={t.title} aria-label={t.title} onClick={t.run}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="segmented" role="tablist">
            {(["write", "split", "preview"] as View[]).map((v) => (
              <button type="button" key={v} role="tab" aria-selected={view === v} className={view === v ? "active" : ""} onClick={() => setView(v)}>
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className={`editor-panes view-${view}`}>
          <textarea
            ref={textarea}
            className="editor-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck
            aria-label="Article text (Markdown)"
            placeholder={"Write the article in Markdown.\n\n## Early life\n\nTom Pearl was born in …[^1]\n\n[^1]: Source for the claim."}
          />
          <div className="editor-preview article-body" aria-label="Preview">
            <h1 className="preview-title">{title || "Untitled"}</h1>
            {summary && <p className="page-summary">{summary}</p>}
            <div dangerouslySetInnerHTML={{ __html: preview.html || '<p class="muted">Nothing to preview yet.</p>' }} />
          </div>
        </div>
        <div className="editor-stats muted small">
          {body.trim() ? body.trim().split(/\s+/).length : 0} words · {preview.toc.length} sections · {preview.links.length} wiki links ·{" "}
          <a href="/wiki/editing-guide" target="_blank">Formatting help ↗</a>
        </div>
      </section>

      <section className="editor-save">
        <div className="field field-wide">
          <label htmlFor="ed-msg">Edit summary</label>
          <input id="ed-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Briefly describe your changes (becomes the commit message)" maxLength={200} />
        </div>
        <div className="editor-actions">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create page" : "Publish changes"}
          </button>
          <button type="button" className="btn" onClick={() => router.back()} disabled={saving}>
            Cancel
          </button>
          <span className="muted small hide-sm">Ctrl/⌘ + S to save</span>
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={remove} disabled={saving}>
              Delete page
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
