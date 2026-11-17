# The Pearl Registry

An encyclopedia-style wiki about **Tom Pearl**, built with Next.js. Anyone can read it and sign in with GitHub. When the **owner of this repository** signs in, editing unlocks automatically.

Every page is a Markdown file in [`content/pages/`](content/pages), and every edit made on the site is a **git commit to this repository**. You get full revision history, diffs and undo for free.

## Features

- **GitHub sign-in.** Only the `read:user` scope is requested, so visitors grant no repository access.
- **Owner-only editing.** The signed-in GitHub login is compared to the repo owner on every request. Others see "View source".
- **Rich editor.** Structured fields (title, description, categories, aliases, infobox, image, featured flag, "Did you know" facts), a formatting toolbar, a live split preview, Ctrl/⌘+S to save, an unsaved-changes guard, edit-conflict detection, and page deletion.
- **Wiki markup.** `[[wiki links]]` (red when the page is missing), `[^footnote]` citations with auto-built reference lists, and templates (`{{stub}}`, `{{todo|…}}`, `{{main|…}}`, `{{see also|…}}`, `{{citation needed}}`, `{{quote|…|…}}`).
- **Article pages.** Infoboxes, a numbered table of contents, categories, read time, contributors, "Cite this page", and alias redirects.
- **History.** Revision list, old-revision view, and line-by-line diffs, all read from git.
- **Discovery.** Instant search (press `/`), full-text search with a category filter, All pages A–Z, Categories, Recent changes, Random page, What links here, and Wanted/orphaned pages.
- **Design.** Light/dark/auto theme, responsive down to phone width, and print styles.

## Setup (about 5 minutes)

### 1. Create a GitHub OAuth app

GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**

- **Homepage URL:** your site URL (e.g. `https://pearlregistry.vercel.app`)
- **Authorization callback URL:** `https://YOUR-SITE/api/auth/callback/github`

Copy the **Client ID** and generate a **Client secret**.

### 2. Create a token for saving edits

GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**

- **Repository access:** only `langluaa/pearlregistry`
- **Permissions:** **Contents → Read and write**

The token stays on the server. It's used to read pages live and to commit your edits (authored as you).

### 3. Deploy

The easiest route is [Vercel](https://vercel.com/new): import this repository and add these environment variables (see [`.env.example`](.env.example)):

| Variable | Value |
| --- | --- |
| `GITHUB_ID` | OAuth app client ID |
| `GITHUB_SECRET` | OAuth app client secret |
| `NEXTAUTH_SECRET` | Output of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your site URL |
| `GITHUB_REPO` | `langluaa/pearlregistry` |
| `GITHUB_BRANCH` | The branch that holds `content/pages` (e.g. `main`) |
| `GITHUB_TOKEN` | The fine-grained token from step 2 |
| `REGISTRY_EDITORS` | *(optional)* Extra GitHub usernames allowed to edit, comma-separated |

Then visit the site, click **Sign in with GitHub**, and you'll see an **Owner** badge and **Edit** tabs.

### Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values; for local OAuth use http://localhost:3000 as the callback host
npm run dev
```

If `GITHUB_TOKEN` is empty, pages are read from `./content/pages`. In `npm run dev`, saves write straight to those files. In production without a token, the site is read-only.

## Writing content

See the in-site **Editing guide** (`/wiki/editing-guide`) and **Style guide** (`/wiki/style-guide`). Images go in `public/images/` and are referenced as `/images/name.jpg`.

The seed articles are deliberately **scaffolds**: section structure, infobox fields and `{{todo}}` notes, with no invented facts. Fill them in with real, sourced information.

## Project layout

```
app/                 Routes (main page, /wiki/[slug], edit, history, search, API)
components/          Header, sidebar, editor, infobox, TOC, search box…
lib/store.ts         Content store: GitHub API (live, commits) or local files
lib/markdown.ts      Markdown + wiki links, citations, templates, TOC
lib/auth.ts          NextAuth GitHub provider + owner/editor detection
content/pages/       The registry itself: one Markdown file per article
```
