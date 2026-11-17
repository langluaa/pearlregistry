import { NextResponse } from "next/server";
import { searchPages } from "@/lib/search";
import { listPages } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50);
  const hits = searchPages(await listPages(), q, limit).map(({ slug, title, summary }) => ({ slug, title, summary }));
  return NextResponse.json({ hits });
}
