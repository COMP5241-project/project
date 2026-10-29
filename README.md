# EduGenAI — PolyU GenAI-Powered Software Engineering Platform

> **PolyU Education 4.0 Initiative**: A student-centered, AI-empowered learning platform designed to deliver personalized, gamified, and interactive software engineering education for both non-CS and CS students.

---

## 🎨 1. Design System & Style Guidelines

To maintain visual consistency across all team members' contributions, all pages must adhere to the official PolyU brand design rules:

### Color Palette
* **Primary (PolyU Brick Red):** `#A21942` (`bg-[#A21942]`, `text-[#A21942]`)
* **Secondary (Dark Slate/Charcoal):** `#262626` (`bg-[#262626]`, `text-[#262626]`)
* **Background Accent (Light Grey):** `#F8F9FA` (`bg-slate-50` or `#F8F9FA`)
* **Card Borders / Dividers:** `#E5E7EB` (`border-gray-200`)
* **Success / Progress Green:** `#10B981` (`bg-emerald-500`)

### Typography & Component Styling
* **Font Family:** Sans-serif (`Inter`, `system-ui`, or Tailwind default sans).
* **Layout Grid:** Single-page responsiveness using Tailwind CSS CDN. Maximum content width set to `max-w-7xl mx-auto px-4`.
* **Primary Buttons:** `bg-[#A21942] text-white hover:bg-[#801333] transition-colors rounded-md px-4 py-2 font-medium`
* **Cards:** `bg-white rounded-lg border border-gray-200 shadow-sm p-6`

---

## 🚀 2. Detailed Core Feature Specifications & Roadmap

Below is the complete feature breakdown mapping out user workflows, AI triggers, and data structures across all four platform modules.
---

### Module A: Authentication & Diagnostic Onboarding

#### A1. Role-Based Authentication & Router
* **User Flow:** User enters email and password on `/login`; FastAPI verifies them with Supabase Auth.
* **Validation & Routing:** The backend returns the authenticated user's `profiles.role`. Students go to `/student`; instructors go to `/instructor.html`. That instructor page checks the backend session and role before showing the studio. Email domains and browser storage do not determine roles.
* **Sessions:** An opaque HttpOnly cookie identifies the backend session. Supabase access/refresh tokens stay server-side. Assessment flags control the existing student dashboard views.

#### A2. Diagnostic Debugging Assessment (Background Profiling)
* **Objective:** Automatically determine whether a student should follow the **CS Major Track** or **Non-CS Major Track** without filling out manual survey forms.
* **Mechanic:** A 2-minute diagnostic minigame presenting a broken code snippet (e.g., an off-by-one array error or missing API parameter).
* **Branching Logic:**
  * **Pass (Bug Fixed Correctly):** Profile set to `CS_TRACK`. System unlocks high-complexity architecture, system design, and AI code review modules[cite: 1].
  * **Fail / Skip:** Profile set to `NON_CS_TRACK`. System unlocks concept-first pathways, plain-English prompt engineering games, and intuitive analogies[cite: 1].
* **Manual Override:** Students can manually toggle between "CS Major" and "Non-CS Major" modes at any time via their profile header.

---

```bash
npm run build
```
### Module B: Student Learning Hub & Interactive Sandboxes

#### B0. Public Sample Mini-Course (Implemented)
* **Objective:** Give any visitor — no account needed — a 20-minute, hands-on taste of the platform and convert them into signed-in students. The landing page's "Explore this course" button leads here.
* **Content:** A 7-screen guided run: welcome, an SDLC decision simulation, a 5-slide mini-lesson + 3-question quiz, a vague-vs-precise prompt lab, the **Break the Bot** mini-game (find the hidden flaws in a canteen pre-order bot), a reflection, and a scored summary with badges.
* **Access model:** The course is public; deterministic answers (decisions, quiz, bot inputs) are checked server-side so answer keys never ship to the browser. The AI tutor grades two free-response moments: guests get **2 uses total** (exactly one full run), signed-in students get **3 tries per moment**. Answers are limited to 20–300 characters, with a coarse per-IP safety cap.
* **Persistence:** Guest progress lives in the browser only (localStorage resume, no personal data); completed runs by signed-in students are saved to `sample_course_results`.

#### B1. Gamified Skill Tree Navigation
* **Visual Tech-Tree:** Graphical representation of mini-courses (Fundamentals of SE, AI Coding Agents, Soft & Product Skills)[cite: 1].
* **Gamification Elements:** Locked/unlocked nodes, XP reward counters, completion status indicators, and badges for streak milestones.

#### B2. Interactive Role-Play Sandbox (Soft & Product Skills)
* **Toxic Stakeholder / PM Simulator:**
  * **Scenario:** An AI NPC acts as a demanding Product Manager insisting on skipping integration tests to hit a deadline.
  * **Student Task:** Negotiate scope, explain technical debt in accessible language, and maintain professional boundaries.
  * **AI Evaluation:** Upon conversation completion, the LLM scores the student on *Empathy*, *Communication Clarity*, and *Technical Boundary-Setting*.
* **Mock Technical Interviewer:** AI simulates technical screening interviews, adjusting strictness based on whether the student is on the CS or Non-CS track[cite: 1].

#### B3. Interactive Coding & Review Sandbox (SE & AI Agents)
* **Prompt Golf Challenge (Non-CS & CS):** Students are given a functional requirement and must prompt an AI coding agent to generate bug-free code using the fewest words possible.
* **Code Review Boss Battle (CS Track):** The AI generates a Pull Request containing subtle memory leaks or security flaws. The CS student must identify the flaw, reject the PR, and provide constructive code review comments.
* **Spot the Hallucination (non-CS Track):** 4 non-CS-friendly challenges with playful "AI intern" framing (Time-Travel Booking App, Weather Bot With Amnesia, The Playlist That Skips, The Chatbot That Overshares). The learner is asked to select the line of the code which may contain hallucination from "AI intern" and explain the rationale behind. An AI-powered Tutor will judge the learner's selection and explanation to produce a score out of 100. The Tutor will also provide feedback about what the learner has done well and what could be improved.
* **Embedded Monaco Editor Component:** Dark-themed code editor with syntax highlighting, a live execution output pane, and a "Submit to AI Tutor" button for immediate diagnostic feedback.

---

### Module C: Instructor Studio & Course Management (NotebookLM Style)

#### C1. Multi-Source Material Ingestion
* **Inputs:** Instructors can paste raw lecture notes, text summaries, or reference URLs into the studio form[cite: 1].

#### C2. GenAI Slides & Quiz Generator
* **AI Engine:** Sends instructor prompts and source context to the backend-only OpenRouter integration.
* **Structured output:** Slide decks include editable slide text and diagram/photo visuals. Multiple-choice quizzes use a separate question/options/correct-answer/explanation schema rather than being represented as slides.

#### C3. Content CMS & Manual Editing
* **Slide editor:** 16:9 WYSIWYG canvas, inline text editing, slide thumbnails, reordering, duplication, deletion, and text formatting controls.
* **Theme editor:** Apply preset palettes or custom theme colors (background, text, accent, cards) to the whole deck or a single slide; themes persist with the resource.
* **Undo & versioning:** Edits can be undone/redone (buttons or Ctrl+Z / Ctrl+Shift+Z); a server-side version is captured automatically before each AI revision and can be restored from the History panel.
* **Quiz builder:** Edit questions, answers, option order, and correct answers; student preview offers instant answer feedback and explanations.
* **File-scoped AI conversations:** Each resource maintains its own messages and sends its current JSON structure when requesting a revision.
* **Server persistence & export:** Resources are saved in Supabase through the backend. Slide decks and quizzes export as PPTX (built server-side; quiz answer keys stay in speaker notes) or as PDF through a print view.

#### C4. Course Publishing & Roster Analytics
* **Publishing Pipeline:** Instructors toggle "Publish for students" on a slide deck or quiz; published courses appear instantly in the student dashboard's "Your courses" list, and the student link (`/courses/:id`) can be copied for sharing.
* **Student course player:** Students view published slide decks (themed 16:9 slides) and sit quizzes; answers are checked server-side (answer keys never reach the client) and every attempt plus course start/completion is recorded for analytics.
* **Roster Analytics Dashboard:** Instructors import a student roster (CSV with `name,email` columns) in the "Student Analytics" view, and re-imports refresh it. Roster emails are matched to signed-up accounts automatically, and the dashboard reports enrollment, matched accounts, recent activity, participation rate, quiz averages, and per-course start/completion counts.

---

### Module D: Self-Directed "Learn Anything" & AI Safety Gatekeeper

#### D1. Custom Domain Pathway Generation
* **Feature:** Allows learners to input any non-SE topic (e.g., "Financial Data Analysis with Python" or "Digital Marketing Analytics") to create a self-learning pathway[cite: 1].

#### D2. Two-Step AI Safety Gatekeeper Filter
To prevent prompt injection, off-topic misuse, or inappropriate content generation, all user prompts pass through a security workflow:
1. **Step 1 (Gatekeeper Check):** A fast classification call verifies if the prompt is safe, educational, and appropriate.
2. **Step 2 (Course Generation):** If approved, the main LLM builds a 3-node mini-pathway complete with Web Slides and quizzes[cite: 1].

---

## 🧩 UI Layer Tech Stack

The front-end UI layer is implemented using the following technologies:

The frontend application code and its Vite configuration are in `frontend/`. Route screens are in `frontend/src/routes/`, and shared API and session utilities are in `frontend/src/lib/`. The frontend does not use the Supabase SDK directly.

* **React 19** — component-based UI development
* **Vite** — fast frontend build and development tooling
* **TypeScript** — static typing for safer component and state logic
* **TanStack Router** — client-side routing for page navigation
* **Tailwind CSS 4** — utility-first styling and responsive layout
* **Lucide React** — icon set for interface actions and status indicators

---

## ⚙️ Backend Tech Stack

The backend API is implemented using the following technologies:

The backend application code is in `backend/app/`; its dependencies and Python project settings are in `backend/pyproject.toml`. The backend's `README.md` contains its setup and run instructions.

* **Python 3.14+** — backend application language
* **FastAPI** — web framework for building the API
* **uv** — Python project and dependency management

The backend provides greeting/health endpoints, Supabase password authentication, session refresh/logout, user-scoped profile queries, AI tutoring, the public sample mini-course (with a quota-limited AI tutor), instructor-only AI course generation, instructor material management (sources, version snapshots, PPTX export, publishing), student course delivery (server-checked quiz answers and progress tracking), and roster import with participation analytics. Assessment-submission endpoints are not yet implemented.

---

## ⚙️ Development & Formatting Conventions

### Project Structure
* `frontend/` — React application, Vite configuration, and frontend dependencies.
* `frontend/index.html` — Vite app entry point; mounts the React root.
* `frontend/src/main.tsx` — App bootstrap and top-level rendering.
* `frontend/src/routes/` — TanStack Router screens, including the home, login, student, and instructor routes.
* `frontend/src/routes/courses_.sample.tsx` — the public sample mini-course (`/courses/sample`).
* `frontend/src/components/sample-course/` — sample-course screens and the shared AI tutor moment component.
* `frontend/src/routeTree.gen.ts` — Generated route tree used by TanStack Router.
* `frontend/src/lib/` — Shared API adapter, role cache, and profile utilities.
* `frontend/src/styles.css` — Global styles and Tailwind CSS import.
* `frontend/public/` — Static frontend assets.
* `backend/app/main.py` — FastAPI application, API error handling, greeting, and health endpoints.
* `backend/app/auth.py` — Supabase authentication, cookie sessions, and profile endpoints.
* `backend/app/sample_course/` — sample mini-course content bank, server-checked answers, quota-limited AI tutor, and guest quota bookkeeping.
* `backend/app/routers/sample_course.py` — public sample-course endpoints (content, answer, tutor).
* `backend/pyproject.toml` — Backend project settings and dependencies; `backend/uv.lock` locks dependency versions.
* `supabase/migrations/` — SQL migrations for the Supabase database.
* `state/` — Project state files.

### Frontend Development
Run the frontend commands from the `frontend/` directory:
```bash
npm install
npm run dev
```

Tailwind CSS is integrated with Vite and imported in `frontend/src/styles.css`. Router setup and page composition are in `frontend/src/main.tsx` and `frontend/src/routes/`. See `backend/README.md` for backend setup and development commands.

### Backend Authentication Setup

Configure `SUPABASE_URL` and `SUPABASE_KEY` (public anon/publishable) in `backend/.env`,
using the authentication settings in `.env.example`. No frontend Supabase environment
variables are required. Run these commands in a separate terminal:

```powershell
cd backend
uv sync
uv run fastapi dev app/main.py
```

Open `http://localhost:5173` (or the forwarded port 5173 URL in Codespaces);
Vite forwards `/api` to `http://127.0.0.1:8000`.
If the frontend uses another port, update `FRONTEND_ORIGINS` in `backend/.env`.
Use one backend process: the demo store is in memory and a backend restart requires
signing in again. Production requires HTTPS, secure cookies, shared session storage,
and a same-origin API reverse proxy. Existing frontend-SDK sessions do not migrate.
