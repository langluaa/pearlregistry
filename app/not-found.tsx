import Link from "next/link";

export default function NotFound() {
  return (
    <article className="article">
      <h1 className="page-title">Page not found</h1>
      <p>That address doesn’t lead anywhere in the registry.</p>
      <p><Link href="/">Return to the main page</Link> or <Link href="/search">search the registry</Link>.</p>
    </article>
  );
}
