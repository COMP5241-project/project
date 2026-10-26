# agents.md — COMP5241 Course Notes viewer

Maintenance guide for the AI agent / developer taking over this piece.

## What this is

A **single, self-contained HTML file** (`course-notes.html`) that renders the
COMP5241 course notes. The notes live as plain markdown in per-language
subfolders; the viewer fetches the right file, converts it to HTML with a
built-in (dependency-free) markdown parser, and shows it with a live table of
contents.

- The viewer is plain HTML + CSS + vanilla JS with no browser dependencies.
  Its AI Tutor calls a Vercel serverless function, which keeps the OpenRouter
  API key on the server.
- **6 languages × 5 chapters = 30 markdown files**, all with **identical
  filenames** across languages (only the folder differs).
- Styled to the **PolyU EduGenAI design system** in `recommended style.md`
  (`#A21942` primary, `#262626` ink, `#F8F9FA` page, `#E5E7EB` borders,
  `#10B981` success).

## Files

| File | What it is |
| --- | --- |
| `course-notes.html` | The whole viewer: markup, CSS, markdown parser, TOC, scroll-spy, load logic |
| `en/`, `zh-tw/`, `zh-cn/`, `ja/`, `de/`, `es/` | One folder per language, 5 chapter `.md` files each |
| `recommended style.md` | The PolyU design-system spec the viewer is styled to (reference only — **not** shipped to the site) |
| `agents.md` | This file |

Chapter filenames (identical in every language folder):

```
01-software-development-in-the-age-of-ai.md
02-software-development-lifecycle.md
03-collaboration-and-version-control.md
04-ai-assisted-software-development-practices.md
05-software-testing-overview.md
```

## Run / preview

The viewer **fetches** the markdown, so it must be served over HTTP — a
`file://` page cannot `fetch()` local files (the viewer shows a friendly error
in that case).

```bash
# From the repo root, serve the whole site and open the viewer:
npx serve . -l 4174
# → http://localhost:4174/course%20notes/course-notes.html
```

Or, after a full build, serve `dist/` and open
`http://localhost:<port>/course%20notes/course-notes.html`.

## How it works (important concepts)

1. **Relative base path.** `course-notes.html` lives *inside* `course notes/`,
   and each language's markdown sits in a subfolder next to it. So the fetch
   URL is just `"<lang>/<chapter>.md"` — **no `course notes/` prefix**.
   (`const BASE = ""` in the script.) If you move the HTML out of the folder,
   update `BASE` to match.
2. **Chapter + language dropdowns.** Chapter list is hard-coded in `CHAPTERS`
   (filename + label); the language `<select>` options are in the markup.
   Changing either dropdown triggers `load()`.
   The optional `?chapter=1` through `?chapter=5` URL parameter selects a chapter
   on arrival and takes precedence over the saved chapter. The COMP5241 overview
   uses these links for its chapter guide.
3. **Request race guard.** `load()` bumps a `loadSeq` token; after the `await`,
   it discards the result if a newer load has started. This stops a slow
   response from an earlier selection from overwriting a newer one when the
   user switches quickly. **Keep this guard** if you touch `load()`.
4. **Persistence.** Last `{chapter, lang}` is stored in
   `localStorage["course-notes-viewer:v1"]` and restored on load.
5. **Markdown parser** (`mdToHtml`) supports: headings (h1–h6, with generated
   `id`s for the TOC), paragraphs, nested ordered/unordered lists, tables,
   fenced code blocks, blockquotes, horizontal rules, and inline
   bold/italic/`code`/links. It is intentionally minimal — extend it only if a
   chapter needs a construct it doesn't handle.
6. **TOC + scroll-spy.** `buildToc()` lists the h2/h3 headings; an
   `IntersectionObserver` highlights the entry for the section in view.

## Deployment

`build.mjs` (repo root) copies `course-notes.html` **and** the six language
folders into `dist/course notes/`. It deliberately **excludes**
`recommended style.md` (a design reference, not site content). The
`course-overview.html` page links to `course%20notes/course-notes.html`; the
root-level `api/course-notes-chat.js` is deployed by Vercel as
`/api/course-notes-chat`. Set `OPENROUTER_API_KEY` in the Vercel project's
Environment Variables. The key must not be placed in the HTML, client-side
JavaScript, or `dist/`. The AI model is fixed in the server function; users
cannot select it.

If you rename the folder or add/remove languages, update **all three** of:
the `CHAPTERS`/language `<select>` in `course-notes.html`, the copy loop in
`build.mjs`, and the link in `index.html`.

## Gotchas

- **Folder name has a space** (`course notes/`) — it is load-bearing for the
  links and the build. Don't rename it without updating `index.html` and
  `build.mjs`.
- The AI Tutor requires the Vercel function and `OPENROUTER_API_KEY`; it will
  not work from a static-only local server. Users do not supply their own key.
- Tutor instructions are fixed in the server function, never accepted from the
  browser. The API rejects common prompt-override attempts and labels chapter
  context as untrusted reference material; this is defense in depth, not a
  guarantee against every prompt injection technique. A rejected attempt shows
  the chat easter-egg message.
- **`serve` strips `.html`** with a 301 redirect (`course-notes.html` →
  `course-notes`). Browsers follow it transparently; it's not an error.
- **Some markdown files contain `??` artifacts** (encoding issues in the
  source notes). The viewer renders them as-is; fix them in the `.md` files if
  they look wrong, not in the parser.
- The rest of the site remains static; the course-notes tutor's Vercel
  serverless function is the intentional API exception.
