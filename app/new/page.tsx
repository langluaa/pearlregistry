import type { Metadata } from "next";
import { SignInButton } from "@/components/AuthButtons";
import Editor from "@/components/Editor";
import { authConfigured, getViewer } from "@/lib/auth";
import { REPO_OWNER } from "@/lib/config";
import { canWrite, listPages, storeMode } from "@/lib/store";

export const metadata: Metadata = { title: "Create a page", robots: { index: false } };

const TEMPLATE = `Write a one-paragraph introduction here: who or what this is, and why it matters to Tom Pearl's story.

## Background

## Details

## See also

- [[Tom Pearl]]
`;

export default async function NewPage({ searchParams }: { searchParams: { title?: string } }) {
  const [pages, viewer] = await Promise.all([listPages(), getViewer()]);
  if (!viewer?.isEditor) {
    return (
      <article className="article">
        <h1 className="page-title">Create a page</h1>
        <div className="notice notice-info">
          {viewer ? (
            <p>Only the registry owner ({REPO_OWNER}) can create pages.</p>
          ) : (
            <>
              <p>Sign in with GitHub to create pages.</p>
              {authConfigured && <SignInButton callbackUrl="/new" large />}
            </>
          )}
        </div>
      </article>
    );
  }
  const modeNote =
    storeMode() === "local" && !canWrite() ? "Read-only deployment: set GITHUB_TOKEN so new pages can be committed to the repository." : undefined;
  return (
    <article className="article">
      <h1 className="page-title">Create a page</h1>
      <Editor
        initial={{ title: searchParams.title || "", summary: "", categories: [], aliases: [], infobox: {}, image: "", imageCaption: "", featured: false, facts: [], body: TEMPLATE }}
        existingSlugs={pages.map((p) => p.slug)}
        allCategories={[...new Set(pages.flatMap((p) => p.categories))].sort()}
        modeNote={modeNote}
      />
    </article>
  );
}
