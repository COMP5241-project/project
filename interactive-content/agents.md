# AGENTS.md — mini-game_prototype (COMP5241)

Guidance for AI agents (and humans) working in this repository.

## What this is

A COMP5241 mini-game prototype site. It is **one deployable static site** made
of four self-contained pieces:

| Piece | Path | What it is |
| --- | --- | --- |
| Landing page | `index.html` | Course catalogue entry with footer actions |
| Course catalogue | `course.html` | Available courses and future course placeholders |
| COMP5241 overview | `course-overview.html` | Course details, chapter links, and interactive activities |
| **Gold Rush Hook** | `gold_hook/` | A Gold Miner–style SDLC game (Next.js 15 + Canvas 2D + Zustand) |
| Testers & the Bar | `bar_animation/` | A 23-scene animated SVG story (single HTML file) |
| Whip demo | `state your requirements clearly/` | Unified side-by-side comparison of two prompt interpretations |
| Course notes | `course notes/` | A self-contained viewer for the COMP5241 notes (5 chapters × 6 languages) |
| Tomori easter egg | `e_egg/` | A colored ASCII-art viewer of Tomori (single HTML file + source txt) |

Each subfolder is **independent** and has its own `agents.md` / `AGENTS.md`
with deeper detail. Read the relevant one before editing that piece:

- `gold_hook/AGENTS.md` — game architecture, design system, tuning knobs
- `bar_animation/agents.md` — the animated story
- `state your requirements clearly/origin whip/agents.md` — first interpretation
- `state your requirements clearly/polyu-style/AGENTS.md` — second interpretation
- `course notes/agents.md` — the course notes viewer

## Deployment model (important)

The site is deployed primarily as static files (e.g. on Vercel). The course
notes AI Tutor additionally uses one Vercel serverless function so its
OpenRouter key stays server-side. The static build pipeline is:

```
npm run build          # root package.json → runs node build.mjs
```

`build.mjs` does three things:

1. Installs + builds the Next.js game (`gold_hook/`) as a **static export**
   (`output: "export"`, `basePath: "/gold_hook"` in `gold_hook/next.config.mjs`),
   producing `gold_hook/out/`.
2. Copies `index.html`, `course.html`, and `course-overview.html` to the root of `dist/`.
3. Copies `gold_hook/out/` → `dist/gold_hook/`, plus the two demo folders,
   into `dist/`.

`vercel.json` points Vercel at `buildCommand: npm run build` and
`outputDirectory: dist`. The static files are assembled in `dist/`; Vercel
also deploys `api/course-notes-chat.js` as a serverless function:

```
dist/
  index.html
  course.html                          ← course catalogue
  course-overview.html                 ← course detail, chapters, and activities
  gold_hook/...                       ← game (served at /gold_hook/)
  bar_animation/...
  state your requirements clearly/...
  course notes/...                    ← course notes viewer + markdown
  e_egg/...                           ← Tomori ASCII art easter egg
```

**Consequences for agents:**

- The game is served from the **`/gold_hook/` subfolder**, so its HTML
  references `/gold_hook/_next/...`. Do **not** remove `basePath` or
  `output: "export"` from `gold_hook/next.config.mjs` unless you also change
  the whole deployment strategy.
- All cross-page links in `index.html` must be **relative** (e.g.
  `gold_hook/`, `bar_animation/testers-bar-polyu.html`). Never hard-code
  `http://localhost:3000` as a *play* link — that only works on a local dev
  server. (The "How to run" section intentionally documents the local dev
  URL; that one is fine.)
- Folder names with spaces (`state your requirements clearly/`,
  `origin whip/`, `course notes/`) are load-bearing — the links and the build
  copy them verbatim. Don't rename them without updating `index.html` and
  `build.mjs`.
- Keep the course-notes tutor key in Vercel's `OPENROUTER_API_KEY` environment
  variable and route browser requests through `api/course-notes-chat.js`. Never
  expose the key in static files.

## Commands

```bash
# Whole site (what Vercel runs)
npm run build          # → dist/  (installs + builds the game, assembles dist)

# Game only (local dev)
cd gold_hook
npm install
npm run dev            # http://localhost:3000
npm run build          # static export → gold_hook/out
npm run typecheck      # tsc --noEmit

# Demos
# Open the .html files directly in a browser — no build step.
```

There is no committed test suite. Verify by building, opening the pages in a
browser, and (for the game) exercising the phase machine.

## Repo layout

```
index.html                          ← landing page (static, links to everything)
course.html                         ← course catalogue and future course placeholders
course-overview.html                ← COMP5241 course overview and activities
build.mjs                           ← root build: game export + assemble dist/
package.json                        ← root scripts (build, typecheck)
vercel.json                         ← Vercel: buildCommand + outputDirectory
api/course-notes-chat.js            ← Vercel function for the course-notes tutor
.gitignore                          ← ignores dist/, node_modules/, build artifacts
README.md                           ← project readme
gold_hook/                          ← the game (see gold_hook/AGENTS.md)
bar_animation/                      ← animated SVG story (see its agents.md)
state your requirements clearly/    ← whip demo, two interpretations
course notes/                       ← course notes viewer (see its agents.md)
e_egg/                              ← Tomori ASCII art easter egg (HTML + txt)
```

## Agent rules — do

- Keep the three pieces independent; a change to one should not require
  touching the others.
- Keep all cross-page links in `index.html` relative.
- Preserve the static-export deployment: relative links, `basePath`,
  `output: "export"`.
- Follow each subfolder's own `agents.md`/`AGENTS.md` conventions when
  editing that piece (the game has a strict PolyU design system — see
  `gold_hook/EDUGENAI-README.md`).
- Keep the "prompt precision lesson" linking to `state your requirements clearly/whip.html`;
  that comparison page embeds the two original demos (`origin whip/origin whip.html`,
  `polyu-style/whip_pelican.html`).

## Agent rules — don't

- Don't add a runtime server, API routes, or server-side data fetching to the
  game — the deployment is static.
- Don't hard-code absolute `localhost` URLs as playable links.
- Don't rename the space-containing demo folders without updating both
  `index.html` and `build.mjs`.
- Don't commit `dist/`, `node_modules/`, or `gold_hook/out/` (all gitignored).

## Notes for future agents

- The game's core invariant: **SDLC DO's = gold (earn marks) · DON'Ts = rocks
  (lose marks)** — see `gold_hook/AGENTS.md`.
- The whip demo exists to teach that **concise, unambiguous prompts matter**:
  `origin whip.html` is the first (loose) interpretation of the prompt, and
  `whip_pelican.html` is the result after re-prompting the specific phrase
  "一個自行車騎著人往前走". `state your requirements clearly/whip.html`
  presents both animations side by side; link to that unified comparison from
  the landing page and course overview.
- If you change the deployment target (e.g. move the game to the site root),
  update `gold_hook/next.config.mjs` (`basePath`), `build.mjs`, and the
  `gold_hook/` links in `index.html` together.

## Homepage update log

### 2026-10-18

- Simplified the landing page to the course catalogue entry and removed the
  requested prototype cards, run instructions, and prompt lesson section.
- Replaced the footer SDLC summary with About Us and Contact Us action buttons.
- Updated the homepage description and layout styles to reflect the reduced
  content and centered catalogue card.
