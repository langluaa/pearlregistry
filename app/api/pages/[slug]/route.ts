import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { parsePage } from "@/lib/page";
import { isValidSlug } from "@/lib/slug";
import { ConflictError, deletePage, getPage, savePage } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 500_000;

async function requireEditor(req: Request) {
  // Reject cross-site writes: the request must come from this site's own pages.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return { error: NextResponse.json({ error: "Cross-site request refused." }, { status: 403 }) };
  const viewer = await getViewer();
  if (!viewer) return { error: NextResponse.json({ error: "Sign in with GitHub first." }, { status: 401 }) };
  if (!viewer.isEditor) return { error: NextResponse.json({ error: "Only the registry owner can edit pages." }, { status: 403 }) };
  return { viewer };
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  const { viewer, error } = await requireEditor(req);
  if (error) return error;
  const { slug } = params;
  if (!isValidSlug(slug)) return NextResponse.json({ error: "Invalid page name." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { raw?: string; message?: string; baseSha?: string; create?: boolean } | null;
  if (!body || typeof body.raw !== "string") return NextResponse.json({ error: "Missing page content." }, { status: 400 });
  if (Buffer.byteLength(body.raw) > MAX_BYTES) return NextResponse.json({ error: "Page is too large." }, { status: 413 });

  const parsed = parsePage(slug, body.raw);
  const existing = body.create ? null : await getPage(slug);
  const verb = body.create || !existing ? "Create" : "Update";
  const summary = (body.message || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const message = `${verb} “${parsed.title}”${summary ? `: ${summary}` : ""}\n\nEdited via the Pearl Registry by @${viewer!.login}.`;

  try {
    const res = await savePage({
      slug,
      raw: body.raw,
      message,
      baseSha: body.baseSha,
      create: !!body.create,
      author: { name: viewer!.name || viewer!.login, login: viewer!.login, id: viewer!.id },
    });
    return NextResponse.json({ ok: true, slug, sha: res.sha });
  } catch (e) {
    if (e instanceof ConflictError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: (e as Error).message || "Save failed." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  const { viewer, error } = await requireEditor(req);
  if (error) return error;
  const page = await getPage(params.slug);
  if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const summary = (body.message || "").replace(/\s+/g, " ").trim().slice(0, 200);
  try {
    await deletePage({
      slug: params.slug,
      message: `Delete “${page.title}”${summary ? `: ${summary}` : ""}\n\nEdited via the Pearl Registry by @${viewer!.login}.`,
      author: { name: viewer!.name || viewer!.login, login: viewer!.login, id: viewer!.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message || "Delete failed." }, { status: 500 });
  }
}
