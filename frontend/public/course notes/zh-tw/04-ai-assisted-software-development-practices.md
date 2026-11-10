# AI 輔助的軟體開發實務

> 整理自課程簡報(44 頁)。與編程代理協作的實務工作流:上下文工程、AGENTS.md 檔案、規格驅動開發、Agent Skills,以及 AI 生產力的實證。

---

## 1. Monorepo vs Polyrepo

- **Monorepo(單倉)**——單一 Git repository 容納多個相關專案的程式碼(例:`apps/` 前端+後端、`services/` 微服務、`packages/` 共用 UI/utils,根目錄 workspaces)。
- **Polyrepo(多倉)**——每個專案/服務各自獨立 repository。
- 對 AI 輔助編程的開放問題:哪種結構更服務代理的上下文?

## 2. 上下文工程

### 編程代理的上下文視窗裝了什麼

對話歷史 · system 與 agent 設定(角色提示、安全規則、專案 profile)· 程式碼與文件(來源、README、引導文件如 `CLAUDE.md`)· 当前任務指示與約束 · 工具描述(MCP server 與外掛的 schema)· 工具輸出(JSON、錯誤、log)· 串流輸出。

### 用正確的上下文給模型打底

- 提供**相關**檔案、合約、範例、最新 API 版本、內部 SDK — 讓模型不要靠猜。
- **不要整個 repository 倒進 prompt**;排除無關上下文以省成本、提升準確度。
- 用範例摘要函式庫/文件;提示要具體(例:「建立 Streamlit app,用 `st.login()` 做驗證」)。

> **上下文工程(Context Engineering)** = 精心策展 LLM 在 session 中看到什麼,以提升品質、可靠性與專案慣例的一致性。**上下文太少**降低效能;**太多**則雜訊多、成本高、甚至惡化行為。

## 3. Agent 指示檔案

一種特殊 Markdown 檔案,編程代理每次 session 自動讀取,以專案目標、技術棧、慣例產生更貼合專案風格的程式碼,減少錯誤(用錯框架/函式庫、重複寫 repository 裡已有的程式碼)。

| 工具 | 位置 |
|---|---|
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/*.mdc` 或 `.cursorrules` |
| Claude Code | `CLAUDE.md` |
| 通用 | repository 根目錄的 `AGENTS.md` |

### 好的指示檔案應包含

- **專案概述** — 做什麼、受眾、關鍵功能。
- **技術棧** — 前後端、框架、DB、API、測試工具,附用途說明。
- **編碼指引** — 風格規則、必要測試、API 設計、安全實務、檔案/資料夾慣例。
- **專案結構** — 主要資料夾及其用途(程式碼/測試/文件在哪)。
- **資源與工具** — 建置/測試/部署腳本、自訂工具、有用檔案。

### 實證(AGENTS.md 評估論文)

- **自動生成的 AGENTS.md 讓成功率下降約 3%、推理成本上升 20%+**(LLM 生成的內容與既有文件重複)。
- **人手撰寫的 AGENTS.md 僅帶來約 4% 的邊際提升**;代理會遵守指示,但多餘的要求反而讓任務更難。
- **應包含** — **WHAT**(技術棧、結構、各部分作用——monorepo 尤為關鍵)、**WHY**(專案與關鍵元件的目的/意圖)、**HOW**(如何建置、測試、驗證;不顯然的工具選擇,如用 `uv` 而非 `pip`、`bun` 而非 `npm`)。
- **不該包含** — 詳細的程式碼庫概覽/目錄清單(代理自己會探索結構)、只偶爾適用的任務指令(會稀釋每個 session 的焦點)、**自動生成的內容**(數據顯示弊大於利)。

## 4. 模型與工作流實務

- **有選擇地挑模型** — 每個 LLM 都有自己的強項;規劃/架構用推理型模型,實作用高速模型;一個模型卡住就換一個突破盲點。
- **Plan mode** — 寫任何程式碼之前先產出詳細實作計畫。
- **以小、可測試的增量工作** — 大型單塊 prompt 導致不一致、重複、「一團糟」。拆成小 ticket:實作一個函式 → 用測試驗證 → 迭代下一步。例:① 前端用 mock 資料,② 後端 REST API + 小測試 client,③ 前後端整合,④ 加資料庫,⑤ 端到端通了再重構。
- **勤 commit** — 頻繁的小 commit 是「存檔點」,AI 程式碼跑偏時快速回滾;用分支/git worktree 當**沙箱**,並行的 AI session 互不衝突。
- **定期重構** — AI 輔助編程會累積技術債;拆長函式、拆大模組、移除重複(AI 偏好生成新程式碼而非重用既有)、提高可重用性與可測試性。
- **「聊天不是工程」。** 隨口 vibe coding 生成的是「紙牌屋」— 上下文視窗一關,就難以維護、除錯、擴展。

## 5. 規格驅動開發(SDD)

- **先寫規格**:寫任何程式碼前,先和 AI 反覆打磨規格 — 需求(邊界情況、使用者流程)、架構(技術棧)、資料模型(schema)、測試策略。
- **SDD 核心**:正式、詳細的規格是**「可執行藍圖」與唯一事實來源**;程式碼是**派生品**。開發者定義 *what* 與 *why*;AI 處理 *how*。
- 工具:**GitHub Spec Kit**、**AWS Kiro**。

### 關鍵元件

- **Constitution**(`constitution.md`) — 治理文件,定義不可妥協的原則:技術棧(例:React/Tailwind)、commit 前必跑測試、TypeScript strict、永不 commit 密鑰等。
- **功能規格**(`spec.md`) — 「什麼」。
- **技術計畫**(`plan.md`) — 「如何」。
- **上下文檔案**(`AGENTS.md`、`SKILL.md`) — 持久指示,代理的「README」。

### 生命週期

1. **Specify(規格化)** — 使用者故事、驗收標準、邊界情況、錯誤處理、成功指標;此階段不做技術決策。
2. **Plan(計畫)** — 代理根據 spec 提出技術計畫:架構、資料模型、API 合約;開發者依標準與 Constitution 審查。
3. **原子任務生成** — 計畫拆成小的可測試任務;一次一個,設有人類檢查點。
4. **Implement(實作)** — 代理按嚴格的 spec/計畫逐任務寫碼;開發者從「寫語法」轉為「對照驗收標準驗證輸出」。

### Spec drift(規格漂移)

- 代理不查 spec 就改程式碼,程式碼與文件便與 spec 脫鉤。
- **bug = 缺失的需求**:更新 spec 使其更明確(永久修復、為未來代理保留上下文、防止手動 patch 常見的回歸)。
- 新功能:先更新 spec → AI 識別 diff → 更新 plan(新資料模型/服務)→ 生成新任務 → 安全實作,不破壞既有邏輯。

## 6. Agent Skills

**理念**:代理能力日強,但缺乏可靠完成實際工作所需的上下文。**Skills** 把程序性知識與團隊特定上下文打包成**可攜、版本控制的資料夾,按需載入**。

- **領域專長** — 把專門知識(法律審查、資料管線、簡報格式)做成可重用指示。
- **可重複工作流** — 多步驟任務變成一致、可稽核的程序。
- **跨產品重用** — 建一次,任何支援 skills 的代理都能用。

### 結構

```
my-skill/
├── SKILL.md      # 必要:metadata(name、description)+ 指示
├── scripts/      # 可選:可執行程式碼(經過測試、確定性)
├── references/   # 可選:按需載入的文件
└── assets/       # 可選:模板、資源
```

- `SKILL.md` 是「教代理完成特定任務的手冊」— 例如 website UI skill 規定「不用藍紫漸層、用 SVG 圖示不用 emoji、磨砂玻璃導覽列、hero 半透明遮罩、品牌強調色按鈕」。
- **各代理的 skill 路徑**:`.cursor/skills/`、`.claude/skills/`、`.github/skills/`、`.opencode/skills/`,通用 `.agents/skills/`。
- **SKILL.md 太長時**:把每種風格拆成獨立 reference 檔(`minimalist.md`、`tech-style.md`、`editorial.md`);`SKILL.md` 變成帶指標的摘要 — 代理先讀它,再只載入相關 reference。
- **Scripts** 讓代理呼叫經過測試的程式碼做計算、轉換、驗證、工具互動 — 確定性強(例:`python scripts/generate_image.py --style tech`)。

### 漸進式揭露(Progressive disclosure,三層)

1. **Metadata**(name + description)— 啟動時恆定載入。
2. **Instructions**(SKILL.md 本體)— 技能被選中時載入。
3. **可選資料夾**(scripts/references/assets)— 按需載入。

代理保留技能名稱/描述**目錄**;收到「幫我開發一個美觀的部落格網站」這類請求時,匹配到 `website-ui-design`,再拉入完整指引。

### 可組合 > 單塊

- **隔離除錯** — 聚焦的 skill 失敗時,知道確切是哪個檔案/參數壞了;含衝突規則的單塊 prompt 無法診斷。
- **複利式升級** — 更新子 skill 會自動升級所有使用它的工作流;避免規則重複腐化。
- **高重用性** — 即插即用:任何子代理或 prompt 都能觸發已存的 skill。
- 知名公開集合:Matt Pocock 的 skills(aihero.dev/skills)、Addy Osmani 的 agent-skills(Define → Plan → Build → Verify → Review → Ship 各階段,如 `interview-me`、`spec-driven-development`、`planning-and-task-breakdown`、`test-driven-development`、`doubt-driven-development`、`code-review-and-quality`、`git-workflow-and-versioning`、`ci-cd-and-automation`、`shipping-and-launch`)。
- 範例 skill 生命週期(frontend-slides):偵測任務類型 → 內容提問 → 以預覽選風格 → 生成單 HTML 簡報 → 可選 PPTX 抽取 → 交付(瀏覽器點選即編輯)→ 可選發布/導出 PDF(腳本:`extract-pptx.py`、`deploy.sh`、`export-pdf.sh`)。

## 7. 實證:MERT 研究(2025)

隨機對照試驗,資深開發者,246 個真實編程任務:

- 開發者**預期** AI 讓其快 24% — 實際**慢 19%**。
- 重度採用 AI 的團隊,**code review 時間 +91%**。
- **PR 尺寸成長 154%**。
- 「按下 Tab 接受建議時我們感覺很有生產力,其實也在累積我們不完全理解的程式碼。」

## 8. AI 時代的關鍵技能

- 理解**系統架構與程式碼為何運作**,比產出程式碼更重要。
- 確保 AI 沒有破壞/改變既有功能的行為;確保生成的架構與程式碼可擴展、靈活、可維護。
- **要求 AI 解釋**:「逐行用白話解釋這段程式碼。」「它做了什麼假設?哪裡可能出錯?」「邊界情況與失敗模式是什麼?」
- **不要提交/接受你解釋不了的程式碼。**
- 審查 AI 程式碼時,專門找 flaw、安全問題、架構違規。
- **定期不用 AI 練習** — 讓樣板碼/簡單 bug/測試生成成為學習練習,而非生產捷徑。
