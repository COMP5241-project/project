# 软件开发中的协作与版本控制

> 整理自课程讲义(46 页)。Git 基础、完整的 Alice/Bob 协作走读、reset/revert/restore 语义、GitHub Flow,以及语义化版本控制。

---

## 1. 为什么需要版本控制

没有版本控制,代码会堆成 `final`、`final_v2`、`FINAL_real` 的文件堆("Piled Higher and Deeper"漫画)。版本控制给你历史、协作与安全网。

## 2. Git 与 GitHub 基础

- **Git**——跟踪源代码历史的版本控制系统。
- **仓库(Repository)**——整个项目的容器:所有文件/文件夹加上完整修订历史;项目工作发生的地方。
- **GitHub**——Git 仓库的云托管(**远程仓库**是任何托管 Git 仓库的服务器,例:GitHub 或 Bitbucket)。

### Clone vs Fork

- **Clone(克隆)**——在本地建立副本;拉取该时点的所有仓库数据(每个文件的每个版本)。用于自己的开发。
- **Fork(派生)**——在 GitHub 上建立个人副本;在 fork 上开发,再以 **pull request** 向原仓库贡献。开源贡献的标准做法。

### 核心命令

| 命令 | 用途 |
|---|---|
| `git clone` | 克隆一个含完整历史的仓库 |
| `git init` | 把目录变成新的空仓库 |
| `git add` | 把工作目录的变更移到暂存区 |
| `git commit` | 把暂存变更提交到本地仓库 |
| `git push` | 把本地提交推送到远程 |
| `git pull` | 拉取远程更新并合并到当前分支 |
| `git fetch` | 获取远程最新更新(不合并) |
| `git merge` | 把获取的更新合并到当前分支 |
| `git checkout` | 切换分支,或从某个提交还原文件 |
| `git branch` | 列出/创建分支 |
| `git log` | 显示提交历史(消息、作者、时间戳) |
| `git status` | 当前仓库状态、变更、分支信息 |
| `git diff` | 显示分支/提交之间的差异 |

### 三个区域

1. **工作目录(Working directory)**——实际编辑文件的文件夹。
2. **暂存区(Staging area / index)**——工作区与永久历史之间的"装卸平台"。
3. **本地仓库**——项目在各时间点的永久存档快照。

- **Commit** = 把暂存文件移入本地仓库的永久快照;分配唯一 ID。
- **Push** = 上传本地提交(例:`main`)到远程(`origin/main`)。
- **Branch(分支)** = 从 `main` 分出的独立开发线;让功能/bug 工作在完成前保持隔离。
- **Merge(合并)** = 把完成的分支整合回 main;创建一个**有两个父提交**的新提交,包含两条分支的全部工作。

## 3. 情境走读(Alice & Bob)

1. `git clone https://github.com/project/login-app.git` — 下载仓库 + 完整历史;本地文件夹链接到 `origin`。
2. Alice 创建登录表单:`git add index.html` → `git commit -m 'Add login form to index.html'`。
3. 同步:`git push origin main` — origin 与 Alice 的历史一致。
4. Alice 隔离新工作:`git checkout -b feature`(创建并切换)。`git branch` 列出分支。
5. Alice 美化 UI(CSS、按钮图标),暂存、提交。
6. 同时 **Bob 往远程 `main` 推了变更** — 加了无障碍属性(`aria-label` 供屏幕阅读器)并大写文字。
7. `git fetch` — 更新对远程的认知(下载 Bob 的提交),**不动工作文件**。`origin/main` 是**远程跟踪分支**(对远程分支的引用;clone 后默认远程名为 "origin")。
8. `git diff origin/main` — 发现 Alice 和 Bob **改了同一行**。
9. `git merge origin/main` — **自动合并失败**(同一行被双方修改)。Git 插入**冲突标记**,同时显示两个版本。
10. Alice 手动**解决冲突** — 结合两版最好的部分、删除标记(需要人类意图;Git 无法自动做)。
11. 收尾:`git add index.html` → `git commit -m 'Merge origin/main; resolve login button conflict'` → `git push origin feature`。
12. **Pull Request(PR)** — 专为团队检视代码、提问、在成为永久前确保质量而设的空间。Bob 审查并留言。
13. Alice 在本地处理反馈:编辑 → `git add` → `git commit -m 'Update button text'`。
14. `git push origin feature` — **不需要新的 PR**;推到同一分支会自动更新既有 PR 的对话。Bob 批准;功能合并进 `main`。

## 4. Conventional Commits(约定式提交)

一个轻量规范,用结构化的提交消息建立明确、一致的历史。常见类型:

| 类型 | 含义 |
|---|---|
| `feat:` | 新功能 |
| `fix:` | bug 修复 |
| `docs:` | 文档变更 |
| `style:` | 格式/风格(不影响行为) |
| `refactor:` | 重构(不加功能、不修 bug) |
| `test:` | 新增/修改测试 |
| `chore:` | 维护(依赖更新、`.gitignore` 等配置、项目文档等) |

## 5. Fetch vs Pull 与分支卫生

- **`git fetch`**:下载新数据,不动工作文件 — 安全,可先审查再合并。
- **`git pull`** = fetch + 立即合并到当前工作。
- **经常从 main pull**:在功能分支上保持最新、与他人的更新同步;降低合并冲突风险;小冲突增量解决,避免最后一次性面对大量复杂冲突。

## 6. GitHub Flow

为定期部署的团队设计的轻量分支式工作流:

1. **创建分支** — 从 `main` 分出,隔离新想法与功能,防止开发者之间冲突变更。
2. **频繁提交** — 透明的历史,方便回滚特定变更而不波及不相关的工作。
3. **开 PR** — 提议把分支变更合并回 main,启动讨论与审查。
4. **审查与讨论** — 审查者提建议或提问;开发者继续提交处理反馈。
5. **合并进 main** — 功能成为生产就绪的代码。

## 7. 撤销操作

`git reset [mode] HEAD~2` — 撤销最近两个提交(HEAD = 当前分支最新提交;`HEAD~2` = 往前两个)。三种模式:

| 模式 | 历史 | 暂存区(index) | 工作目录 | 使用时机 |
|---|---|---|---|---|
| `--soft` | 回退 | **变更保持已暂存** | 不动 | "我后悔把这些拆成不同提交" — 把凌乱提交 **squash** 成一个干净提交 |
| `--mixed`(默认) | 回退 | 清空 | **变更保留、未暂存** | "我后悔提交了,但想继续做" — 重新思考暂存方式、拆分提交 |
| `--hard` | 回退 | **摧毁** | **摧毁** | "我后悔这些提交发生过" — 仓库完全回到目标提交;**谨慎使用** |

- **Force push**(`git push --force`):用本地分支覆盖远程分支历史;远程上多出的提交会被删除。
  - **最佳实践**:绝不 reset 已推到共享远程的分支;只 reset 仅存在于本机的提交;否则会删掉队友的提交,造成冲突与混乱历史。
- **`git revert`**:创建一个**新提交**来引入被撤销提交的逆向变更 — 不改写历史;在协作环境中**最安全的撤销方式**。
- **`git restore <file>`**:把工作目录中的文件还原到上次提交(HEAD)的状态(例:`git restore style.css`,快速撤销实验性改动)。

## 8. 代码之外的协作

- **GitHub Issues** — 跟踪增强、任务、bug(bug 报告 / 功能请求)。
- **Release(发布)** — 把特定稳定版本的软件打包分发给用户/其他系统。
- **Release notes(发布说明)** — 该版本的变更、改进、修复与重要信息的文档摘要。

## 9. 语义化版本控制(Semantic Versioning)

`MAJOR.MINOR.PATCH`:

- **MAJOR** — 破坏性变更(breaking change)。
- **MINOR** — 新增功能(向后兼容)。
- **PATCH** — bug 修复。

**练习**(初始 v1.0.0):
- `fix: remove exposed Azure API key` → **v1.0.1**
- `feat: add Python Flask API backend` → **v1.1.0**
- `feat: upgrade to v2 API structure`(破坏性)→ **v2.0.0**

## 10. 重点 takeaway

- 心智模型:**工作目录 → 暂存区 → 本地仓库 → 远程**;每个命令都在这些区域之间搬移文件。
- 用分支隔离工作;用 merge(或 PR)集成;有意识地解决冲突。
- `fetch` 安全,`pull` 会合并;经常从 main pull 保持分支新鲜。
- 共享历史用 `revert`;本地用 `reset`;绝不用 `--force` 压过队友的工作。
- Conventional Commits + 语义化版本控制,让历史与发布具备可预测、可机器读取的形状。
