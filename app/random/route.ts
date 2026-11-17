import { NextResponse } from "next/server";
import { listPages } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const pages = await listPages();
  const pick = pages[Math.floor(Math.random() * pages.length)];
  return NextResponse.redirect(new URL(pick ? `/wiki/${pick.slug}` : "/", req.url));
}
