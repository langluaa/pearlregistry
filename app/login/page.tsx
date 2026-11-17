import type { Metadata } from "next";
import Link from "next/link";
import { GitHubMark, SignInButton } from "@/components/AuthButtons";
import { Logo } from "@/components/Header";
import { authConfigured, getViewer } from "@/lib/auth";
import { REPO_OWNER } from "@/lib/config";

export const metadata: Metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  const viewer = await getViewer();
  return (
    <div className="login">
      <div className="login-card">
        <Logo size={56} />
        <h1>Sign in to the Pearl Registry</h1>
        {viewer ? (
          <>
            <p>
              You’re signed in as <strong>{viewer.login}</strong>.{" "}
              {viewer.isOwner ? "As the repository owner you have full edit access." : viewer.isEditor ? "You have edit access." : "You have read-only access."}
            </p>
            <Link className="btn btn-primary" href="/">Go to the main page</Link>
          </>
        ) : authConfigured ? (
          <>
            <p className="muted">
              Anyone can read the registry. Signing in with GitHub identifies you; if you’re <strong>{REPO_OWNER}</strong>, the repository owner, editing unlocks
              automatically.
            </p>
            {searchParams.error && <div className="notice notice-error">Sign-in failed ({searchParams.error}). Please try again.</div>}
            <SignInButton callbackUrl={searchParams.callbackUrl || "/"} large />
            <p className="muted small">We only request your public profile (<code>read:user</code>). No repository access is granted.</p>
          </>
        ) : (
          <div className="notice notice-warn">
            <p><GitHubMark /> GitHub sign-in isn’t configured yet.</p>
            <p className="small">Set <code>GITHUB_ID</code>, <code>GITHUB_SECRET</code> and <code>NEXTAUTH_SECRET</code> — see the README for a 3-minute setup.</p>
          </div>
        )}
      </div>
    </div>
  );
}
