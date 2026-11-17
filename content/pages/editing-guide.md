---
title: Editing guide
summary: How to write and format pages in the Pearl Registry
categories:
  - Registry
aliases:
  - Help
  - Formatting
  - Editing help
infobox:
  Format: Markdown + wiki extensions
  Storage: Git (one file per page)
  Shortcut: Ctrl/⌘ + S saves
  Search: Press / anywhere
facts:
  - …that pressing / anywhere in the registry jumps straight to the search bar?
---
This guide explains how to edit pages in the Pearl Registry. Pages are written in **Markdown** with a few wiki extensions. The editor has a toolbar for all of them and a live preview, so you rarely need to type the syntax yourself. Also see the [[Style guide]].

## Getting started

1. Sign in with GitHub using the button at the top right. Only the registry owner gets edit access.
2. Open any page and click **Edit**, or use **Create page** in the sidebar.
3. Fill in the title, the short description, categories and (optionally) the infobox.
4. Write the article in the large text area. The preview updates as you type.
5. Describe your change in **Edit summary** and click **Publish changes** (or press Ctrl/⌘ + S).

Your edit becomes a commit in the repository and shows up in [Recent changes](/recent).

## Text formatting

| You type | You get |
| --- | --- |
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `## Heading` | A section heading (appears in the contents box) |
| `### Subheading` | A subsection heading |
| `- item` | A bulleted list |
| `1. item` | A numbered list |
| `> text` | A block quotation |
| `` `code` `` | `code` |

## Links

### Links to other registry pages

Wrap a page title in double square brackets: `[[Career]]` gives [[Career]]. To show different text, add a pipe: `[[Career|his work]]` gives [[Career|his work]]. To link to a section, add `#`: `[[Early life#Education]]` gives [[Early life#Education]].

If a page doesn't exist yet, the link is shown in red, like [[A page that does not exist]]. Clicking it offers to create the page, and every red link is listed under [Wanted pages](/wanted).

### External links

Use standard Markdown: `[GitHub](https://github.com)` gives [GitHub](https://github.com).

## Citations

Add a footnote marker where the claim is, and the source text on its own line anywhere in the page:

```
Tom founded the club in 2019.[^club]

[^club]: "Local club celebrates five years", Town Gazette, 4 May 2024.
```

The registry numbers citations automatically and builds a **References** section at the bottom of the page, like this one.[^example] Use the **[1]** toolbar button to add one with a single click.

## Templates

Templates are written in double curly braces.

| Template | Purpose |
| --- | --- |
| `{{stub}}` | Marks an article as incomplete |
| `{{todo\|What's missing}}` | Leaves a visible note for future editing |
| `{{main\|Page}}` | “Main article” note under a summary section |
| `{{see also\|Page A\|Page B}}` | “See also” note |
| `{{citation needed}}` | Flags a claim that needs a source |
| `{{quote\|Text\|Who said it}}` | A large pull quote |

Here is a pull quote:

{{quote|Accuracy first; everything else second.|The Pearl Registry style guide}}

And a claim that needs a source.{{citation needed}}

## Infoboxes

The infobox is the summary card at the top right of an article. In the editor, open the **Infobox** panel and add field/value pairs. Values can contain **bold**, *italic* and `[[wiki links]]`. A field whose name starts with an em dash (—) becomes a section header row. Set **Image URL** to show a photo.

## Tables

```
| Year | Event |
| --- | --- |
| 2020 | Something happened |
```

## Images

Upload image files to `public/images/` in the repository, then write `![Caption](/images/file.jpg)`. See the [[Gallery]].

## Categories and aliases

- **Categories** group pages. Type them comma-separated, or click a suggestion. Each category has its own page under [Categories](/categories).
- **Aliases** are alternative names. Visiting `/wiki/alias-name` shows the page with a “Redirected from” note, and search matches aliases too.

## History and undo

Every page has a **History** tab listing every revision, with a **diff** view showing exactly which lines changed. Because the registry is a git repository, any old version can be restored: open it with **view**, copy the text, and save it as a new edit.

[^example]: This is what a reference looks like. Click the ^ to jump back to where it was cited.
