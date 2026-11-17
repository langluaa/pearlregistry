import type { TocEntry } from "@/lib/markdown";

export default function Toc({ toc }: { toc: TocEntry[] }) {
  if (toc.length < 3) return null;
  let h2 = 0;
  let h3 = 0;
  return (
    <details className="toc" open>
      <summary>Contents</summary>
      <ol>
        {toc.map((t) => {
          let num: string;
          if (t.level === 2) {
            h2++;
            h3 = 0;
            num = `${h2}`;
          } else {
            h3++;
            num = `${h2}.${h3}`;
          }
          return (
            <li key={t.id} className={`toc-l${t.level}`}>
              <a href={`#${t.id}`}>
                <span className="toc-num">{num}</span> {t.text}
              </a>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
