// Root build script — assembles the site's static files into `dist/`.
// Vercel deploys the separate course-notes API from the root `api/` folder.
//
// Layout produced in dist/:
//   dist/index.html                                  <- landing page
//   dist/course.html                                 <- course catalogue
//   dist/course-overview.html                        <- COMP5241 overview + resources
//   dist/gold_hook/...                               <- Next.js game (static export)
//   dist/bar_animation/...                           <- animated SVG story
//   dist/state your requirements clearly/...         <- unified comparison + source demos
//   dist/course notes/...                            <- course notes viewer + markdown
//   dist/e_egg/...                                   <- Tomori ASCII art easter egg
//
// The game is a Next.js app that is statically exported (output: "export")
// with basePath "/gold_hook", so its HTML references /gold_hook/_next/... and
// the exported files live at the root of gold_hook/out. Copying out/ into
// dist/gold_hook/ makes those absolute references resolve correctly.

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const goldHook = path.join(root, "gold_hook");
const outDir = path.join(goldHook, "out");

const log = (msg) => console.log(`[build] ${msg}`);

// 1. Build the Next.js game (static export -> gold_hook/out).
log("Installing gold_hook dependencies...");
const hasLock = existsSync(path.join(goldHook, "package-lock.json"));
execSync(hasLock ? "npm ci" : "npm install", { cwd: goldHook, stdio: "inherit" });

log("Building gold_hook (Next.js static export)...");
execSync("npm run build", { cwd: goldHook, stdio: "inherit" });

if (!existsSync(outDir)) {
  throw new Error(`Expected static export at ${outDir} but it does not exist.`);
}

// 2. Assemble dist/.
log("Assembling dist/ ...");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Root HTML pages.
cpSync(path.join(root, "index.html"), path.join(dist, "index.html"));
cpSync(path.join(root, "course.html"), path.join(dist, "course.html"));
cpSync(
  path.join(root, "course-overview.html"),
  path.join(dist, "course-overview.html"),
);

// Game -> dist/gold_hook (basePath is /gold_hook).
cpSync(outDir, path.join(dist, "gold_hook"), { recursive: true });

// Demos (folder names contain spaces — copy them verbatim).
cpSync(path.join(root, "bar_animation"), path.join(dist, "bar_animation"), {
  recursive: true,
});
cpSync(
  path.join(root, "state your requirements clearly"),
  path.join(dist, "state your requirements clearly"),
  { recursive: true },
);

// Course notes viewer (HTML + per-language markdown). The "recommended style.md"
// design guide is not part of the site, so copy only the viewer and the
// language folders.
const courseNotes = path.join(root, "course notes");
const courseNotesDist = path.join(dist, "course notes");
mkdirSync(courseNotesDist, { recursive: true });
cpSync(
  path.join(courseNotes, "course-notes.html"),
  path.join(courseNotesDist, "course-notes.html"),
);
for (const lang of ["en", "zh-tw", "zh-cn", "ja", "de", "es"]) {
  cpSync(path.join(courseNotes, lang), path.join(courseNotesDist, lang), {
    recursive: true,
  });
}

// Tomori ASCII art easter egg (HTML viewer + source txt + reference webp).
cpSync(path.join(root, "e_egg"), path.join(dist, "e_egg"), { recursive: true });

log("Done. dist/ is ready to deploy.");
