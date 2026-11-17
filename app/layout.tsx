import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { themeScript } from "@/components/ThemeToggle";
import { getViewer } from "@/lib/auth";
import { REPO, SITE_NAME, SITE_TAGLINE } from "@/lib/config";
import Link from "next/link";

// Every page reflects the latest content and the signed-in user.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_TAGLINE,
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <a href="#content" className="skip-link">Skip to content</a>
        <Header viewer={viewer} />
        <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-hidden="true" />
        <div className="shell">
          <Sidebar viewer={viewer} />
          <main id="content" className="content">
            {children}
          </main>
        </div>
        <footer className="site-footer">
          <div>
            <strong>{SITE_NAME}</strong> — {SITE_TAGLINE}. Every edit is a commit in{" "}
            <a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer">{REPO}</a>.
          </div>
          <div className="footer-links">
            <Link href="/wiki/about-the-pearl-registry">About</Link>
            <Link href="/wiki/editing-guide">Editing guide</Link>
            <Link href="/recent">Recent changes</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
