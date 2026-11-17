export type DiffLine = { type: "same" | "add" | "del"; text: string; a?: number; b?: number };

/** Line-based LCS diff. Fine for wiki-sized documents. */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;
  if (n * m > 4_000_000) {
    return [...a.map((t, i) => ({ type: "del" as const, text: t, a: i + 1 })), ...b.map((t, i) => ({ type: "add" as const, text: t, b: i + 1 }))];
  }
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i], a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i], a: i + 1 });
      i++;
    } else {
      out.push({ type: "add", text: b[j], b: j + 1 });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: a[i], a: ++i });
  while (j < m) out.push({ type: "add", text: b[j], b: ++j });
  return out;
}

/** Collapse long unchanged stretches, keeping `context` lines around each change. */
export function withContext(lines: DiffLine[], context = 3): (DiffLine | { type: "gap"; count: number })[] {
  const keep = new Array(lines.length).fill(false);
  lines.forEach((l, idx) => {
    if (l.type !== "same") for (let k = Math.max(0, idx - context); k <= Math.min(lines.length - 1, idx + context); k++) keep[k] = true;
  });
  const out: (DiffLine | { type: "gap"; count: number })[] = [];
  let gap = 0;
  lines.forEach((l, idx) => {
    if (keep[idx]) {
      if (gap) out.push({ type: "gap", count: gap });
      gap = 0;
      out.push(l);
    } else gap++;
  });
  if (gap) out.push({ type: "gap", count: gap });
  return out;
}
