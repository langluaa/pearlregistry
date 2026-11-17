import Link from "next/link";

type Tab = "read" | "edit" | "history" | "links";

export default function PageTabs({ slug, active, canEdit, exists = true }: { slug: string; active: Tab; canEdit: boolean; exists?: boolean }) {
  const tab = (key: Tab, href: string, label: string) => (
    <Link href={href} className={`tab${active === key ? " active" : ""}`} aria-current={active === key ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <div className="tabs">
      <div className="tabs-left">
        {tab("read", `/wiki/${slug}`, "Article")}
        {exists && tab("links", `/wiki/${slug}/links`, "What links here")}
      </div>
      <div className="tabs-right">
        {tab("read", `/wiki/${slug}`, "Read")}
        {tab("edit", `/wiki/${slug}/edit`, canEdit ? (exists ? "Edit" : "Create") : "View source")}
        {exists && tab("history", `/wiki/${slug}/history`, "History")}
      </div>
    </div>
  );
}
