"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Hit {
  slug: string;
  title: string;
  summary: string;
}

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          setHits(d.hits || []);
          setActive(-1);
        })
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    input.current?.blur();
    router.push(href);
  };

  return (
    <form
      className="searchbox"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && hits[active]) go(`/wiki/${hits[active].slug}`);
        else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <span className="searchbox-icon" aria-hidden="true">⌕</span>
      <input
        ref={input}
        type="search"
        placeholder="Search the registry"
        value={q}
        aria-label="Search the registry"
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Escape") {
            setOpen(false);
            input.current?.blur();
          }
        }}
      />
      <kbd className="searchbox-kbd hide-sm">/</kbd>
      {open && q.trim() && (
        <div className="searchbox-results" role="listbox">
          {hits.map((h, i) => (
            <button
              type="button"
              key={h.slug}
              role="option"
              aria-selected={i === active}
              className={`searchbox-hit${i === active ? " active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(`/wiki/${h.slug}`)}
            >
              <strong>{h.title}</strong>
              {h.summary && <span>{h.summary}</span>}
            </button>
          ))}
          <button type="button" className="searchbox-hit searchbox-all" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}>
            Search for pages containing <strong>{q.trim()}</strong> →
          </button>
        </div>
      )}
    </form>
  );
}
