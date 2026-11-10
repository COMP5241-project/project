# Collaboration and Version Control in Software Development

> Distilled from the course deck (46 slides). Git fundamentals, a full Alice/Bob collaboration walkthrough, reset/revert/restore semantics, GitHub Flow, and semantic versioning.

---

## 1. Why version control

Without it, code accumulates as a pile of `final`, `final_v2`, `FINAL_real` files (the "Piled Higher and Deeper" comic). Version control gives you history, collaboration, and safety.

## 2. Git & GitHub basics

- **Git** — a version control system that tracks source-code history.
- **Repository** — a container for your entire project: all files/folders plus full revision history; your project folder where work happens.
- **GitHub** — cloud hosting for Git repositories (a **remote repository** is any server hosting one, e.g., GitHub or Bitbucket).

### Clone vs fork

- **Clone** — local copy on your machine; pulls all repository data at that point (every version of every file). For your own development.
- **Fork** — personal copy on GitHub; develop there and contribute back via **pull request**. Standard for open-source contribution.

### Core commands

| Command | Purpose |
|---|---|
| `git clone` | Clone a repository with full history |
| `git init` | Turn a directory into a new empty repository |
| `git add` | Move changes from working directory to staging area |
| `git commit` | Commit staged changes to the local repository |
| `git push` | Push local commits to the remote |
| `git pull` | Fetch remote updates and merge into current branch |
| `git fetch` | Retrieve latest remote updates (no merge) |
| `git merge` | Integrate fetched updates into the current branch |
| `git checkout` | Switch branches or restore files from commits |
| `git branch` | List/create branches |
| `git log` | Show commit history (messages, authors, timestamps) |
| `git status` | Current repository status, changes, branch info |
| `git diff` | Show differences between branch/commits |

### The three zones

1. **Working directory** — the actual folder where you edit files.
2. **Staging area (index)** — the "loading dock" between workspace and permanent history.
3. **Local repository** — permanent snapshots of the project at points in time.

- **Commit** = a permanent snapshot moving staged files into the local repository; assigned a unique ID.
- **Push** = upload local commits (e.g., `main`) to the remote (`origin/main`).
- **Branch** = a separate line of development off `main`; keep feature/bug work isolated until complete.
- **Merge** = integrate a finished branch back into main; creates a new commit **with two parents** containing the combined work.

## 3. Scenario walkthrough (Alice & Bob)

1. `git clone https://github.com/project/login-app.git` — downloads repo + full history; local folder links to `origin`.
2. Alice creates a login form: `git add index.html` → `git commit -m 'Add login form to index.html'`.
3. Sync: `git push origin main` — origin matches Alice's history.
4. Alice isolates new work: `git checkout -b feature` (create + switch). `git branch` lists branches.
5. Alice polishes the UI (CSS, button icon), stages, commits.
6. Meanwhile **Bob pushes to remote `main`** — added accessibility attributes (`aria-label` for screen readers) and capitalized the text.
7. `git fetch` — updates knowledge of the remote (downloads Bob's commits) **without touching working files**. `origin/main` is the **remote-tracking branch** (reference to the remote branch; "origin" is the default remote name after clone).
8. `git diff origin/main` — reveals Alice and Bob **modified the same line**.
9. `git merge origin/main` — **automatic merge fails** (same line changed by both). Git inserts **conflict markers** showing both versions.
10. Alice **resolves** the conflict by hand — combines the best of both, deletes the markers (requires human intent; Git can't do this automatically).
11. Finalize: `git add index.html` → `git commit -m 'Merge origin/main; resolve login button conflict'` → `git push origin feature`.
12. **Pull Request** — a dedicated space for teammates to inspect code, ask questions, and ensure quality before the work becomes permanent. Bob reviews and comments.
13. Alice addresses feedback locally: edit → `git add` → `git commit -m 'Update button text'`.
14. `git push origin feature` — **no new PR needed**; pushing to the same branch auto-updates the existing PR conversation. Bob approves; feature merges into `main`.

## 4. Conventional Commits

A lightweight spec for consistent, explicit commit history. Common types:

| Type | Meaning |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | Formatting/style (no behavior change) |
| `refactor:` | Code restructuring without feature/bug changes |
| `test:` | Adding/modifying tests |
| `chore:` | Maintenance (dependency updates, config like `.gitignore`, etc.) |

## 5. Fetch vs pull & branch hygiene

- **`git fetch`**: downloads new data, doesn't touch working files — safe, lets you review before merging.
- **`git pull`** = fetch + immediate merge into current work.
- **Pull from main often** while on a feature branch: keeps the branch current, resolves small conflicts incrementally, avoids one giant conflict at merge time.

## 6. GitHub Flow

Lightweight branch-based workflow for teams with regular deployments:

1. **Create a branch** off `main` — isolated, safe development.
2. **Add commits** frequently — transparent history, easy to revert specific changes.
3. **Open a PR** — starts discussion and review.
4. **Review & discuss** — reviewers suggest improvements; developer commits fixes.
5. **Merge into main** — feature becomes production-ready.

## 7. Undo operations

`git reset [mode] HEAD~2` — undo the last two commits (HEAD = latest commit; `HEAD~2` = two back). Three modes:

| Mode | History | Staging (index) | Working dir | Use when |
|---|---|---|---|---|
| `--soft` | Rewinds | **Changes stay staged** | Untouched | "I regret these were separate commits" — **squash** messy commits into one clean commit |
| `--mixed` (default) | Rewinds | Cleared | **Changes kept, unstaged** | "I regret committing, want to keep working" — rethink staging, split commits |
| `--hard` | Rewinds | **Destroyed** | **Destroyed** | "I regret these commits ever happened" — repo matches the target commit exactly; **use with caution** |

- **Force push** (`git push --force`): overwrites the remote branch with local history; remote-only commits are deleted.
  - **Best practice**: never reset a branch already pushed to a shared remote; only reset commits that exist solely on your machine; teammates' commits would be lost.
- **`git revert`**: creates a **new commit that inverses** an old one — doesn't rewrite history; the **safest undo in collaborative environments**.
- **`git restore <file>`**: revert a working-directory file to the last committed state (e.g., `git restore style.css` after regretting experimental edits).

## 8. Collaboration beyond code

- **GitHub Issues** — track enhancements, tasks, bugs (bug reports / feature requests).
- **Release** — packaging & distributing a specific stable version to users/systems.
- **Release notes** — documented summary of changes, improvements, fixes for that release.

## 9. Semantic Versioning

`MAJOR.MINOR.PATCH`:

- **MAJOR** — breaking change.
- **MINOR** — new feature/functionality (backward-compatible).
- **PATCH** — bug fixes.

**Exercise** (initial v1.0.0):
- `fix: remove exposed Azure API key` → **v1.0.1**
- `feat: add Python Flask API backend` → **v1.1.0**
- `feat: upgrade to v2 API structure` (breaking) → **v2.0.0**

## 10. Key takeaways

- Mental model: **working directory → staging area → local repo → remote**; every command moves files between these zones.
- Branch to isolate work; merge (or PR) to integrate; resolve conflicts deliberately.
- `fetch` is safe, `pull` merges; pull from main often to keep branches fresh.
- Prefer `revert` on shared history; `reset` locally; never `--force` over teammates' work.
- Conventional commits + semantic versioning give history and releases a predictable, machine-readable shape.
