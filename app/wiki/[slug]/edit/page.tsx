import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/AuthButtons";
import Editor from "@/components/Editor";
import PageTabs from "@/components/PageTabs";
import { authConfigured, getViewer } from "@/lib/auth";
import { REPO_OWNER } from "@/lib/config";
import { titleFromSlug } from "@/lib/slug";
import { canWrite, listPages, storeMode } from "@/lib/store";

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `Editing ${titleFromSlug(params.slug)}`, robots: { index: false } };
}

export default async function EditPage({ params }: Params) {
  const [pages, viewer] = await Promise.all([listPages(), getViewer()]);
  const page = pages.find((p) => p.slug === params.slug);
  const canEdit = !!viewer?.isEditor;

  if (!page) {
    if (canEdit) redirect(`/new?title=${encodeURIComponent(titleFromSlug(params.slug))}`);
    redirect(`/wiki/${params.slug}`);
  }

  if (!canEdit) {
    return (
      <article className="article">
        <PageTabs slug={page.slug} active="edit" canEdit={false} />
        <h1 className="page-title">View source for {page.title}</h1>
        <div className="notice notice-info">
          {viewer ? (
            <p>
              You’re signed in as <strong>{viewer.login}</strong>, but only the registry owner (<strong>{REPO_OWNER}</strong>) can edit pages. You can still read
              the source below.
            </p>
          ) : (
            <>
              <p>This page is protected. Only the registry owner can edit it — sign in with GitHub to continue.</p>
              {authConfigured && <SignInButton callbackUrl={`/wiki/${page.slug}/edit`} large />}
            </>
          )}
        </div>
        <textarea className="source-view" readOnly value={page.raw} rows={30} aria-label="Page source" />
        <p><Link href={`/wiki/${page.slug}`}>← Return to {page.title}</Link></p>
      </article>
    );
  }

  const allCategories = [...new Set(pages.flatMap((p) => p.categories))].sort();
  const modeNote =
    storeMode() === "local"
      ? canWrite()
        ? "Development mode: saves are written to ./content/pages on this machine (no GITHUB_TOKEN set)."
        : "Read-only deployment: set GITHUB_TOKEN so edits can be committed to the repository."
      : undefined;

  return (
    <article className="article">
      <PageTabs slug={page.slug} active="edit" canEdit />
      <h1 className="page-title">Editing {page.title}</h1>
      <Editor
        slug={page.slug}
        sha={page.sha}
        initial={page}
        existingSlugs={pages.map((p) => p.slug)}
        allCategories={allCategories}
        modeNote={modeNote}
      />
    </article>
  );
}
