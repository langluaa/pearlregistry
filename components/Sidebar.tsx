import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { REPO } from "@/lib/config";

export default function Sidebar({ viewer }: { viewer: Viewer | null }) {
  return (
    <nav className="sidebar" aria-label="Registry navigation">
      <div className="sidebar-section">
        <h4>Navigation</h4>
        <Link href="/">Main page</Link>
        <Link href="/wiki/tom-pearl">Tom Pearl</Link>
        <Link href="/wiki/timeline">Timeline</Link>
        <Link href="/all">All pages</Link>
        <Link href="/categories">Categories</Link>
        <Link href="/random" prefetch={false}>Random page</Link>
      </div>
      <div className="sidebar-section">
        <h4>Registry</h4>
        <Link href="/recent">Recent changes</Link>
        <Link href="/search">Advanced search</Link>
        <Link href="/wiki/about-the-pearl-registry">About the registry</Link>
        <Link href="/wiki/editing-guide">Editing guide</Link>
      </div>
      {viewer?.isEditor && (
        <div className="sidebar-section sidebar-editor">
          <h4>Editor tools</h4>
          <Link href="/new">+ Create page</Link>
          <Link href="/wanted">Wanted pages</Link>
          <a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer">Source repository ↗</a>
        </div>
      )}
    </nav>
  );
}
