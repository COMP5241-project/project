# mini-game_prototype

A **COMP5241 mini-game prototype site** — one deployable static site made of four
self-contained pieces:

| Piece | Path | What it is |
| --- | --- | --- |
| 🏠 Landing page | `index.html` | Static front page that links to everything below |
| 📚 Course catalogue | [`course.html`](./course.html) | Available courses with a detailed COMP5241 overview |
| 🧭 COMP5241 overview | [`course-overview.html`](./course-overview.html) | Course summary, chapter guide, and linked activities |
| ⛏️ **Gold Rush Hook** | [`gold_hook/`](./gold_hook) | A Gold Miner–style **SDLC learning game** (Next.js 15 + Canvas 2D + Zustand) |
| 🍺 Testers & the Bar | [`bar_animation/`](./bar_animation) | A 23-scene **animated SVG story** (single HTML file) |
| 🪶 Whip demo | [`state your requirements clearly/`](./state%20your%20requirements%20clearly) | Two HTML interpretations of one prompt — a lesson in **prompt precision** |
| 📚 Course notes | [`course notes/`](./course%20notes) | A self-contained **COMP5241 notes viewer** (5 chapters × 6 languages) |
| 🥚 Tomori easter egg | [`e_egg/`](./e_egg) | A **colored ASCII-art** viewer of Tomori (single HTML file + source txt) |

Each piece is independent and has its own `agents.md` / `AGENTS.md` and (for the
game) a full `README.md`. This file is the project-level overview.

---

## The game in one line

> **Hook the DO's of the SDLC for marks, dodge the DON'Ts.**

A Gold Miner–style browser game where the **DO's of the Software Development
Lifecycle are the gold** (hook one → earn marks) and the **DON'Ts are the rocks**
(hook one → lose marks). Every object carries its lesson as a label
(e.g. `Run unit tests ✓`, `Skip testing ✗`). Three levels, a between-level shop
with four upgrades, `localStorage` saves, and fully synthesised Web Audio SFX.
100 % client-side — no server, no database, no game engine.

Full details: [`gold_hook/README.md`](./gold_hook/README.md) and
[`gold_hook/AGENTS.md`](./gold_hook/AGENTS.md).

---

## The prompt-precision lesson

The `state your requirements clearly/` folder demonstrates why **concise,
unambiguous prompts matter** when working with agents. One prompt was given to an
agent:

> 寫一個html程式，內容是一個動態svg：一個自行車騎著人往前走，然後後面有個鵜鶘拿鞭子抽他，人要有受擊反饋。

- **`origin whip/origin whip.html`** — the agent's **first** interpretation of the
  whole prompt.
- **`polyu-style/whip_pelican.html`** — the result after the specific phrase
  **「一個自行車騎著人往前走」** was re-prompted on top of the first result.

[`state your requirements clearly/whip.html`](./state%20your%20requirements%20clearly/whip.html)
embeds both animations side by side so the two interpretations can be compared
on one page. Each demo can still be opened separately from the comparison page.
The landing page's **"Prompt precision lesson"** and COMP5241 overview both link
to this unified comparison.

---

## Run it locally

### Whole site (what the deployment runs)

```bash
npm run build        # installs + builds the game, assembles everything into dist/
```

Then open `dist/index.html` in a browser, or serve the folder:

```bash
npx serve dist       # or: python -m http.server --directory dist
```

### Game only (dev server)

```bash
cd gold_hook
npm install
npm run dev          # http://localhost:3000
```

### Demos

Open the `.html` files directly in any modern browser (Chrome / Edge) — no build
step:

- `bar_animation/testers-bar-polyu.html`
- `state your requirements clearly/whip.html`
- `state your requirements clearly/origin whip/origin whip.html`
- `state your requirements clearly/polyu-style/whip_pelican.html`

The **course notes viewer** and the **Tomori easter egg** fetch their source
files, so serve them over HTTP (from the repo root): `npx serve . -l 4174` →
`http://localhost:4174/course%20notes/course-notes.html` and
`http://localhost:4174/e_egg/tomori.html`.

---

## Deploy to Vercel

The site is primarily static files. The course-notes AI Tutor uses one Vercel
serverless function to keep its OpenRouter API key out of the browser.

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Vercel reads [`vercel.json`](./vercel.json):
   - `buildCommand`: `npm run build`
   - `outputDirectory`: `dist`
4. In the Vercel project settings, add `OPENROUTER_API_KEY` as an Environment
   Variable for each environment where the AI Tutor should be available. Do
   not add the key to frontend files or commit it to the repository.
5. Deploy. The result is served as:
   - `/` — landing page
   - `/course.html` — available courses and future course placeholders
   - `/course-overview.html` — COMP5241 overview, chapter guide, and activities
   - `/gold_hook/` — the game
   - `/bar_animation/testers-bar-polyu.html` — the bar story
   - `/state your requirements clearly/whip.html` — side-by-side whip-demo comparison
   - `/course notes/course-notes.html` — the course notes viewer
   - `/e_egg/tomori.html` — the Tomori ASCII art easter egg

### How the build works

[`build.mjs`](./build.mjs) (run by `npm run build`) does five things:

1. Installs + builds the Next.js game as a **static export**
   (`output: "export"`, `basePath: "/gold_hook"` in
   [`gold_hook/next.config.mjs`](./gold_hook/next.config.mjs)) → `gold_hook/out/`.
2. Copies `index.html`, `course.html`, and `course-overview.html` to the root of `dist/`.
3. Copies `gold_hook/out/` → `dist/gold_hook/`, plus the two demo folders, into
   `dist/`.
4. Copies the course notes viewer (`course-notes.html` + the six language
   folders) → `dist/course notes/` (the `recommended style.md` design guide is
   intentionally excluded).
5. Copies the Tomori easter egg (`tomori.html` + `tomori_ascii-art.txt` + the
   reference webp) → `dist/e_egg/`.

Vercel separately deploys [`api/course-notes-chat.js`](./api/course-notes-chat.js)
as `/api/course-notes-chat`; it proxies bounded chat requests to OpenRouter
using the server-side `OPENROUTER_API_KEY`. The static viewer does not need or
store a user's API key, and the model is fixed by the server function.

Because the game is exported with `basePath: "/gold_hook"`, its HTML references
`/gold_hook/_next/...`, which resolves correctly when `out/` is placed at
`dist/gold_hook/`. All cross-page links in `index.html` are **relative**, so the
site works from any host.

---

## Repository layout

```
.
├── index.html                          # landing page (static, links to everything)
├── course.html                         # course catalogue
├── course-overview.html                # COMP5241 course detail and activity links
├── build.mjs                           # root build: game export + assemble dist/
├── package.json                        # root scripts (build, typecheck)
├── vercel.json                         # Vercel: buildCommand + outputDirectory
├── .gitignore                          # ignores dist/, node_modules/, build artifacts
├── agents.md                           # agent guidance for the whole repo
├── README.md                           # this file
├── gold_hook/                          # the game (Next.js) — see gold_hook/AGENTS.md
│   ├── app/                            #   layout, page, globals.css
│   ├── components/                     #   GameShell, GameCanvas, HUD, screens, shop
│   └── lib/                            #   store + game logic (hook, levels, catalog…)
├── bar_animation/                      # animated SVG story — see bar_animation/agents.md
│   └── testers-bar-polyu.html
├── state your requirements clearly/    # whip demo — two interpretations
│   ├── whip.html                       # unified side-by-side comparison
│   ├── origin whip/
│   │   └── origin whip.html
│   └── polyu-style/
│       └── whip_pelican.html
├── course notes/                       # course notes viewer — see course notes/agents.md
│   ├── course-notes.html
│   └── en/ zh-tw/ zh-cn/ ja/ de/ es/   #   5 chapter .md files each
└── e_egg/                              # Tomori ASCII art easter egg
    ├── tomori.html
    └── tomori_ascii-art.txt
```

---

## Tech stack

- **Game:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Canvas 2D ·
  Zustand · Web Audio API
- **Landing page & demos:** plain HTML + CSS + inline SVG (no frameworks)
- **Deployment:** static export → `dist/` → Vercel

---

## Conventions for contributors

- Keep the four pieces **independent** — a change to one shouldn't require
  touching the others.
- Keep all cross-page links in `index.html` **relative** (never hard-code
  `localhost` as a playable link).
- Preserve the static-export deployment (`basePath`, `output: "export"`).
- The game follows a strict **PolyU EduGenAI design system** — see
  [`gold_hook/EDUGENAI-README.md`](./gold_hook/EDUGENAI-README.md).
- Don't commit `dist/`, `node_modules/`, or `gold_hook/out/` (all gitignored).