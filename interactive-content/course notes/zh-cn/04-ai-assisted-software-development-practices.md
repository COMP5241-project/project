# AI 辅助的软件开发实践

> 整理自课程讲义(44 页)。与编程智能体协作的实务工作流:上下文工程、AGENTS.md 文件、规格驱动开发、Agent Skills,以及 AI 生产力的实证。

---

## 1. Monorepo vs Polyrepo

- **Monorepo(单仓)**——单一 Git 仓库容纳多个相关项目的代码(例:`apps/` 前端+后端、`services/` 微服务、`packages/` 共享 UI/utils,根目录 workspaces)。
- **Polyrepo(多仓)**——每个项目/服务各自独立仓库。
- 对 AI 辅助编程的开放问题:哪种结构更服务智能体的上下文?

## 2. 上下文工程

### 编程智能体的上下文窗口装了什么

对话历史 · system 与 agent 设置(角色提示、安全规则、项目 profile)· 代码与文档(源码、README、引导文件如 `CLAUDE.md`)· 当前任务指令与约束 · 工具描述(MCP server 与插件的 schema)· 工具输出(JSON、错误、日志)· 流式输出。

### 用正确的上下文给模型打底

- 提供**相关**文件、契约、示例、最新 API 版本、内部 SDK — 让模型不要靠猜。
- **不要把整个仓库倒进 prompt**;排除无关上下文以省成本、提升准确度。
- 用示例总结库/文档;提示要具体(例:"创建 Streamlit app,用 `st.login()` 做认证")。

> **上下文工程(Context Engineering)** = 精心策划 LLM 在会话中看到什么,以提升质量、可靠性与项目惯例的一致性。**上下文太少**降低效果;**太多**则噪声多、成本高、甚至恶化行为。

## 3. Agent 指示文件

一种特殊 Markdown 文件,编程智能体每次会话自动读取,以项目目标、技术栈、惯例产生更贴合项目风格的代码,减少错误(用错框架/库、重复写仓库里已有的代码)。

| 工具 | 位置 |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/*.mdc` 或 `.cursorrules` |
| Claude Code | `CLAUDE.md` |
| 通用 | 仓库根目录的 `AGENTS.md` |

### 好的指示文件应包含

- **项目概述** — 做什么、受众、关键功能。
- **技术栈** — 前后端、框架、数据库、API、测试工具,附用途说明。
- **编码规范** — 风格规则、必要测试、API 设计、安全实践、文件/文件夹惯例。
- **项目结构** — 主要文件夹及其用途(代码/测试/文档在哪)。
- **资源与工具** — 构建/测试/部署脚本、自定义工具、有用文件。

### 实证(AGENTS.md 评估论文)

- **自动生成的 AGENTS.md 让成功率下降约 3%、推理成本上升 20%+**(LLM 生成的内容与既有文档重复)。
- **人工编写的 AGENTS.md 仅带来约 4% 的边缘提升**;智能体会遵守指示,但多余的要求反而让任务更难。
- **应包含** — **WHAT**(技术栈、结构、各部分作用——monorepo 尤为关键)、**WHY**(项目与关键组件的目的/意图)、**HOW**(如何构建、测试、验证;不显眼的工具选择,如用 `uv` 而非 `pip`、`bun` 而非 `npm`)。
- **不该包含** — 详细的代码库概览/目录清单(智能体自己会探索结构)、只偶尔适用的任务指令(会稀释每个会话的焦点)、**自动生成的内容**(数据显示弊大于利)。

## 4. 模型与工作流实践

- **有选择地挑模型** — 每个 LLM 都有自己的强项;规划/架构用推理型模型,实作高速模型;一个模型卡住就换一个突破盲点。
- **Plan mode** — 写任何代码之前先产出详细实现计划。
- **以小、可测试的增量工作** — 大型单块 prompt 导致不一致、重复、"一团糟"。拆成小 ticket:实现一个函数 → 用测试验证 → 迭代下一步。例:① 前端用 mock 数据,② 后端 REST API + 小测试 client,③ 前后端集成,④ 加数据库,⑤ 端到端通了再重构。
- **勤提交** — 频繁的小提交是"存档点",AI 代码跑偏时快速回滚;用分支/git worktree 当**沙箱**,并行的 AI 会话互不冲突。
- **定期重构** — AI 辅助编程会累积技术债;拆长函数、拆大模块、移除重复(AI 偏好生成新代码而非复用已有)、提高可复用性与可测试性。
- **"聊天不是工程"。** 随口 vibe coding 生成的是"纸牌屋" — 上下文窗口一关,就难以维护、调试、扩展。

## 5. 规格驱动开发(SDD)

- **先写规格**:写任何代码前,先和 AI 反复打磨规格 — 需求(边界情况、用户流程)、架构(技术栈)、数据模型(schema)、测试策略。
- **SDD 核心**:正式、详细的规格是**"可执行蓝图"与唯一事实来源**;代码是**派生物**。开发者定义 *what* 与 *why*;AI 处理 *how*。
- 工具:**GitHub Spec Kit**、**AWS Kiro**。

### 关键组件

- **Constitution**(`constitution.md`) — 治理文件,定义不可妥协的原则:技术栈(例:React/Tailwind)、提交前必跑测试、TypeScript strict、永不提交密钥等。
- **功能规格**(`spec.md`) — "什么"。
- **技术计划**(`plan.md`) — "如何"。
- **上下文文件**(`AGENTS.md`、`SKILL.md`) — 持久指示,智能体的"README"。

### 生命周期

1. **Specify(规格化)** — 用户故事、验收标准、边界情况、错误处理、成功指标;此阶段不做技术决策。
2. **Plan(计划)** — 智能体根据 spec 提出技术计划:架构、数据模型、API 契约;开发者按标准与 Constitution 审查。
3. **原子任务生成** — 计划拆成小的可测试任务;一次一个,设有人类检查点。
4. **Implement(实现)** — 智能体按严格的 spec/计划逐任务写码;开发者从"写语法"转为"对照验收标准验证输出"。

### Spec drift(规格漂移)

- 智能体不查 spec 就改代码,代码与文档便与 spec 脱节。
- **bug = 缺失的需求**:更新 spec 使其更明确(永久修复、为未来智能体保留上下文、防止手动 patch 常见的回归)。
- 新功能:先更新 spec → AI 识别 diff → 更新 plan(新数据模型/服务)→ 生成新任务 → 安全实现,不破坏既有逻辑。

## 6. Agent Skills

**理念**:智能体能力日益增强,但缺乏可靠完成实际工作所需的上下文。**Skills** 把程序性知识与团队特定上下文打包成**可携带、版本控制的文件夹,按需加载**。

- **领域专长** — 把专门知识(法律审查、数据管线、演示格式)做成可复用指令。
- **可重复工作流** — 多步骤任务变成一致、可审计的流程。
- **跨产品复用** — 建一次,任何支持 skills 的智能体都能用。

### 结构

```
my-skill/
├── SKILL.md      # 必需:metadata(name、description)+ 指令
├── scripts/      # 可选:可执行代码(经过测试、确定性)
├── references/   # 可选:按需加载的文档
└── assets/       # 可选:模板、资源
```

- `SKILL.md` 是"教智能体完成特定任务的手册" — 例如 website UI skill 规定"不用蓝紫渐变、用 SVG 图标不用 emoji、磨砂玻璃导航栏、hero 半透明遮罩、品牌强调色按钮"。
- **各智能体的 skill 路径**:`.cursor/skills/`、`.claude/skills/`、`.github/skills/`、`.opencode/skills/`,通用 `.agents/skills/`。
- **SKILL.md 太长时**:把每种风格拆成独立 reference 文件(`minimalist.md`、`tech-style.md`、`editorial.md`);`SKILL.md` 变成带指针的摘要 — 智能体先读它,再只加载相关 reference。
- **Scripts** 让智能体调用经过测试的代码做计算、转换、验证、工具交互 — 确定性高(例:`python scripts/generate_image.py --style tech`)。

### 渐进式披露(Progressive disclosure,三层)

1. **Metadata**(name + description)— 启动时恒定加载。
2. **Instructions**(SKILL.md 本体)— 技能被选中时加载。
3. **可选文件夹**(scripts/references/assets)— 按需加载。

智能体保留技能名称/描述**目录**;收到"帮我开发一个美观的博客网站"这类请求时,匹配到 `website-ui-design`,再拉入完整指引。

### 可组合 > 单块

- **隔离调试** — 聚焦的 skill 失败时,知道确切是哪个文件/参数坏了;含冲突规则的单块 prompt 无法诊断。
- **复利式升级** — 更新子 skill 会自动升级所有使用它的工作流;避免规则重复腐化。
- **高复用性** — 即插即用:任何子智能体或 prompt 都能触发已存的 skill。
- 知名公开集合:Matt Pocock 的 skills(aihero.dev/skills)、Addy Osmani 的 agent-skills(Define → Plan → Build → Verify → Review → Ship 各阶段,如 `interview-me`、`spec-driven-development`、`planning-and-task-breakdown`、`test-driven-development`、`doubt-driven-development`、`code-review-and-quality`、`git-workflow-and-versioning`、`ci-cd-and-automation`、`shipping-and-launch`)。
- 示例 skill 生命周期(frontend-slides):检测任务类型 → 内容提问 → 以预览选风格 → 生成单 HTML 演示 → 可选 PPTX 提取 → 交付(浏览器点选即编辑)→ 可选发布/导出 PDF(脚本:`extract-pptx.py`、`deploy.sh`、`export-pdf.sh`)。

## 7. 实证:MERT 研究(2025)

随机对照试验,资深开发者,246 个真实编程任务:

- 开发者**预期** AI 让其快 24% — 实际**慢 19%**。
- 重度采用 AI 的团队,**code review 时间 +91%**。
- **PR 尺寸增长 154%**。
- "按下 Tab 接受建议时我们感觉很有生产力,其实也在累积我们不完全理解的代码。"

## 8. AI 时代的关键技能

- 理解**系统架构与代码为何工作**,比产出代码更重要。
- 确保 AI 没有破坏/改变既有功能的行为;确保生成的架构与代码可扩展、灵活、可维护。
- **要求 AI 解释**:"逐行用白话解释这段代码。""它做了什么假设?哪里可能出错?""边界情况与失败模式是什么?"
- **不要提交/接受你解释不了的代码。**
- 审查 AI 代码时,专门找缺陷、安全问题、架构违规。
- **定期不用 AI 练习** — 让样板码/简单 bug/测试生成成为学习练习,而非生产捷径。
