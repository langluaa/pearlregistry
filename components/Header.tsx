import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import type { Viewer } from "@/lib/auth";
import { authConfigured } from "@/lib/auth";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";
import { SignInButton, SignOutButton } from "./AuthButtons";

export default function Header({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <label htmlFor="nav-toggle" className="btn btn-ghost btn-sm nav-toggle-btn" aria-label="Menu">☰</label>
        <Link href="/" className="brand" aria-label={`${SITE_NAME} — main page`}>
          <Logo />
          <span className="brand-text">
            <span className="brand-name">The Pearl Registry</span>
            <span className="brand-sub">The Tom Pearl encyclopedia</span>
          </span>
        </Link>
        <SearchBox />
        <div className="topbar-actions">
          <ThemeToggle />
          {viewer ? (
            <details className="usermenu">
              <summary className="btn btn-ghost btn-sm">
                {viewer.image && <img src={viewer.image} alt="" width={22} height={22} className="avatar" />}
                <span className="hide-sm">{viewer.login}</span>
                {viewer.isOwner ? <span className="badge badge-owner">Owner</span> : viewer.isEditor ? <span className="badge">Editor</span> : null}
              </summary>
              <div className="menu">
                <div className="menu-head">
                  Signed in as <strong>{viewer.login}</strong>
                  <div className="muted small">{viewer.isEditor ? "You have edit access." : "Read-only access."}</div>
                </div>
                {viewer.isEditor && (
                  <Link className="menu-item" href="/new">
                    Create a new page
                  </Link>
                )}
                <a className="menu-item" href={`https://github.com/${viewer.login}`} target="_blank" rel="noreferrer">
                  Your GitHub profile
                </a>
                <SignOutButton />
              </div>
            </details>
          ) : authConfigured ? (
            <SignInButton />
          ) : (
            <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo">
      <defs>
        <radialGradient id="pearl-g" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#ece9f6" />
          <stop offset="80%" stopColor="#c9c3dd" />
          <stop offset="100%" stopColor="#9d96b8" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#pearl-g)" stroke="var(--logo-ring)" strokeWidth="1.5" />
      <ellipse cx="14" cy="13" rx="5" ry="3" fill="#fff" opacity=".85" transform="rotate(-30 14 13)" />
      <text x="20" y="26" textAnchor="middle" fontFamily="Georgia, serif" fontSize="16" fontWeight="700" fill="#3b3557">P</text>
    </svg>
  );
}
