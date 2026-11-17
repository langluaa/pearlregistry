import { renderInline } from "@/lib/markdown";
import type { Page } from "@/lib/page";

export default function Infobox({ page, existing }: { page: Page; existing: Set<string> }) {
  const entries = Object.entries(page.infobox);
  if (!entries.length && !page.image) return null;
  // Person pages get a monogram portrait until a real image is added.
  const showFigure = !!page.image || page.categories.some((c) => c.toLowerCase() === "people");
  const initials = page.title
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <aside className="infobox" aria-label={`${page.title} at a glance`}>
      <div className="infobox-title">{page.title}</div>
      {showFigure && (
      <figure className="infobox-image">
        {page.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.image} alt={page.imageCaption || page.title} />
        ) : (
          <div className="infobox-placeholder" aria-hidden="true">
            <span>{initials}</span>
          </div>
        )}
        {(page.imageCaption || !page.image) && (
          <figcaption>{page.imageCaption || "No image yet"}</figcaption>
        )}
      </figure>
      )}
      {entries.length > 0 && (
        <table>
          <tbody>
            {entries.map(([k, v]) =>
              k.startsWith("—") || k.startsWith("--") ? (
                <tr key={k} className="infobox-header">
                  <th colSpan={2}>{k.replace(/^[—-]+\s*/, "")}</th>
                </tr>
              ) : (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td dangerouslySetInnerHTML={{ __html: renderInline(v, existing) }} />
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </aside>
  );
}
