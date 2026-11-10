# AI-Assisted Software Development Practices

> Distilled from the course deck (44 slides). Practical workflows for working with coding agents: context engineering, AGENTS.md files, spec-driven development, agent skills, and the evidence on AI productivity.

---

## 1. Monorepo vs polyrepo

- **Monorepo** — single Git repository for multiple related projects (e.g., `apps/` frontend+backend, `services/` microservices, `packages/` shared UI/utils with root workspaces).
- **Polyrepo (multirepo)** — each project/service in its own repository.
- Open question for AI-assisted coding: which layout serves agent context better?

## 2. Context engineering

### What fills a coding agent's context window

Conversation history · system & agent setup (role prompt, safety rules, project profile) · code & docs (source, README, guidance files like `CLAUDE.md`) · current task instructions & constraints · tool descriptions (schemas, MCP servers) · tool outputs (JSON, errors, logs) · streaming output.

### Ground the model with the right context

- Provide **relevant** files, contracts, examples, latest API versions, internal SDKs — so the model doesn't guess.
- **Don't dump entire repositories** into the prompt; exclude irrelevant context to cut cost and improve accuracy.
- Summarize libraries/docs with examples; be specific (e.g., "Create a Streamlit app. Use `st.login()` for authentication").

> **Context engineering** = carefully curating what the LLM sees in a session to improve quality, reliability, and alignment with project conventions. **Too little** context reduces effectiveness; **too much** is noisy, costly, and can worsen behavior.

## 3. Agent instruction files

A special Markdown file read automatically by coding agents at the start of each session, giving project goals, tech stack, and conventions — producing code that matches project style and fewer errors (wrong framework, duplicating existing code).

| Tool | Location |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/*.mdc` or `.cursorrules` |
| Claude Code | `CLAUDE.md` |
| Common | `AGENTS.md` at repo root |

### What a good instruction file contains

- **Project overview** — what it does, audience, key features.
- **Tech stack** — backend/frontend, frameworks, DBs, APIs, testing tools, with usage notes.
- **Coding guidelines** — style rules, required tests, API design, security practices, file/folder conventions.
- **Project structure** — main folders and their purposes (where code/tests/docs live).
- **Resources & tools** — setup/test/deploy scripts, custom tools, useful files.

### Evidence (AGENTS.md evaluation paper)

- **Auto-generated AGENTS.md reduces success rate by ~3% and raises inference cost 20%+** (LLM-generated files are redundant with existing docs).
- **Human-written AGENTS.md improves performance only marginally (~4%)**; agents follow the instructions, but unnecessary requirements make tasks harder.
- **Include** — **WHAT** (tech stack, structure, what each part does — critical for monorepos), **WHY** (purpose/intent), **HOW** (build, test, verify; non-obvious tooling like `uv` instead of `pip`, `bun` instead of `npm`).
- **Exclude** — detailed codebase overviews/directory listings (agents discover structure themselves), task-specific instructions that only apply sometimes (they dilute every session), and **auto-generated content** (data shows it hurts more than helps).

## 4. Model & workflow practices

- **Choose models deliberately** — each LLM has strengths; use reasoning-heavy models for planning/architecture and fast models for implementation; if one model gets stuck, swap to break the blind spot.
- **Plan mode** — produce a detailed implementation plan before any code is written.
- **Work in small, testable increments** — large monolithic prompts yield inconsistency, duplication, a "jumbled mess." Break work into small tickets: implement one function → verify with tests → iterate. Example order: (1) frontend with mocked data, (2) backend REST API + small test client, (3) integrate, (4) add database, (5) refactor once end-to-end works.
- **Commit often** — frequent small commits are "save points" for quick rollback when AI code goes off course; use branches/git worktrees as **sandboxes** so concurrent AI sessions don't conflict.
- **Refactor regularly** — AI-assisted coding accumulates technical debt; split long functions, break large modules, remove duplication (AI prefers generating new code over reusing existing), make code reusable/testable.
- **"Chatting is not engineering."** Casual vibe-coding produces a "house of cards" that works until the context window closes — then it's hard to maintain, debug, or scale.

## 5. Spec-driven development (SDD)

- **Spec first**: iterate on the specification with the AI before writing code — requirements (edge cases, user flows), architecture (tech stack), data models (schema), testing strategy.
- **SDD core idea**: formal, detailed specs are the **"executable blueprints" and source of truth**; code is a **derived artifact**. Developers define the *what* and *why*; AI handles the *how*.
- Tools: **GitHub Spec Kit**, **AWS Kiro**.

### Key components

- **Constitution** (`constitution.md`) — governance doc of non-negotiable principles: tech stack (e.g., React/Tailwind), always run tests before committing, TypeScript strict mode, never commit secrets.
- **Functional spec** (`spec.md`) — the "what".
- **Technical plan** (`plan.md`) — the "how".
- **Context files** (`AGENTS.md`, `SKILL.md`) — persistent instructions, a "README for AI agents".

### Lifecycle

1. **Specify** — user stories, acceptance criteria, edge cases, error handling, success metrics; no technical decisions yet.
2. **Plan** — agent proposes architecture, data models, API contracts; developer reviews against standards and the Constitution.
3. **Atomic task generation** — plan broken into small, testable tasks; one at a time, with human checkpoints.
4. **Implement** — agent codes task-by-task against the rigid spec/plan; developer shifts from writing syntax to **verifying output against acceptance criteria**.

### Spec drift

- If an agent changes code without checking the spec, code and docs diverge.
- **Bugs = missing requirements**: update the spec to be more explicit (permanent fix, preserves context for future agents, prevents the regressions common with manual patching).
- New features: update the spec first → AI identifies the delta → plan updated (new data models/services) → new tasks generated → safe implementation.

## 6. Agent skills

**Idea**: agents are capable but lack context for reliable real work. **Skills** package procedural knowledge and team-specific context into **portable, version-controlled folders, loaded on demand**.

- **Domain expertise** — capture specialized knowledge (legal review, data pipelines, presentation formatting) as reusable instructions.
- **Repeatable workflows** — turn multi-step tasks into consistent, auditable procedures.
- **Cross-product reuse** — build once, use in any skills-compatible agent.

### Structure

```
my-skill/
├── SKILL.md      # required: metadata (name, description) + instructions
├── scripts/      # optional: executable code (tested, deterministic)
├── references/   # optional: documentation loaded on demand
└── assets/       # optional: templates, resources
```

- `SKILL.md` is "a manual that teaches the agent how to complete one specific task" — e.g., a website UI skill encoding "no blue-purple gradients, SVG icons not emoji, frosted-glass nav bar, hero with overlay, brand accent buttons."
- **Skill paths per agent**: `.cursor/skills/`, `.claude/skills/`, `.github/skills/`, `.opencode/skills/`, common `.agents/skills/`.
- **When SKILL.md grows too long**: split each style into its own reference file (`minimalist.md`, `tech-style.md`, `editorial.md`); `SKILL.md` becomes a summary with pointers — the agent reads it first, then loads only the relevant reference.
- **Scripts** let the agent call tested code for calculations, transformations, validation, tool interaction — predictably (e.g., `python scripts/generate_image.py --style tech`).

### Progressive disclosure (3 levels)

1. **Metadata** (name + description) — always loaded at startup.
2. **Instructions** (SKILL.md body) — loaded when the skill is selected.
3. **Optional folders** (scripts/references/assets) — loaded on demand.

The agent keeps a **catalog** of skill names/descriptions; on a request like "develop a beautiful blog website" it matches `website-ui-design`, then pulls in the full guidance.

### Composable > monolithic

- **Isolated debugging** — a focused skill that fails tells you exactly which file/parameters broke; monolithic prompts with conflicting rules are undiagnosable.
- **Compounding upgrades** — updating a sub-skill upgrades every workflow that uses it; avoids rule duplication/rot.
- **High reusability** — plug-and-play: any subagent or prompt can trigger a saved skill.
- Notable public collections: Matt Pocock's skills (aihero.dev/skills), Addy Osmani's agent-skills (Define → Plan → Build → Verify → Review → Ship stages, e.g., `interview-me`, `spec-driven-development`, `planning-and-task-breakdown`, `test-driven-development`, `doubt-driven-development`, `code-review-and-quality`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `shipping-and-launch`).
- Example skill lifecycle (frontend-slides): detect job type → content questions → pick style by preview → generate single-HTML deck → optional PPTX extraction → deliver with click-to-edit → optional publish/PDF export (scripts: `extract-pptx.py`, `deploy.sh`, `export-pdf.sh`).

## 7. Evidence: MERT study (2025)

Randomized controlled trial, experienced developers, 246 real-world coding tasks:

- Developers **expected** AI to speed them up by **24%** — actually took **19% longer**.
- **Code review time +91%** for teams heavily adopting AI.
- **Pull request sizes grew 154%**.
- "While we feel productive by pressing Tab and accepting suggestions, we are accumulating code we don't fully understand."

## 8. Critical skills in the AI era

- Understanding **why** the system works (architecture) matters more than producing code.
- Ensure AI doesn't break/change existing behavior; ensure generated architecture is scalable, flexible, maintainable.
- **Ask AI to explain**: "Explain this code line by line in plain language." / "What assumptions is it making? What could go wrong?" / "What are the edge cases and failure modes?"
- **Do not submit/accept code you can't explain.**
- Review AI code specifically for flaws, security issues, architectural violations.
- **Practice regularly without AI** — let boilerplate/simple bugs/test generation be learning exercises, not production shortcuts.
