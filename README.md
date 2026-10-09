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
* **User Flow:** User enters their PolyU email address on `index.html`.
* **Validation & Routing:**
  * `@connect.polyu.hk` (e.g., `26001399g@connect.polyu.hk`) -> Sets `userRole: "student"` in `localStorage` and opens Onboarding Modal or redirects to `student.html`.
  * `@polyu.edu.hk` (e.g., `richard.lui@polyu.edu.hk`) -> Sets `userRole: "instructor"` in `localStorage` and redirects to `instructor.html`.

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
* **Spot the Hallucination (non-CS Track):** 4 non-CS-friendly challenges with playful "AI intern" framing (Time-Travel Booking App, Weather Bot With Amnesia, The Playlist That Skips, The Chatbot That Overshares) — bug families: hallucinated API, missing parameter, off-by-one, oversharing.
* **Embedded Monaco Editor Component:** Dark-themed code editor with syntax highlighting, a live execution output pane, and a "Submit to AI Tutor" button for immediate diagnostic feedback.

---

### Module C: Instructor Studio & Course Management (NotebookLM Style)

#### C1. Multi-Source Material Ingestion
* **Inputs:** Instructors can paste raw lecture notes, text summaries, or reference URLs into the studio form[cite: 1].

#### C2. GenAI Course & Web Slides Generator
* **AI Engine:** Sends source materials to OpenRouter API (GPT-4o / Claude 3.5 Sonnet).
* **Output Format (Structured JSON):** Converts source text into a multi-part mini-course:
  * **Interactive Web Slides:** Slide deck containing titles, key takeaways, bullet points, and AI narrator scripts.
  * **Interactive Sandbox Activity:** Auto-generated role-play prompt or prompt golf task.
  * **Knowledge Check:** Auto-generated 3-question multiple-choice quiz with explanations.

#### C3. Content CMS & Manual Editing
* **Form-Based Editor:** Instructors can review the AI-generated slides and quizzes in an editable form, manually tweaking text, adjusting quiz options, or modifying the AI NPC's persona before publishing[cite: 1].

#### C4. Course Publishing & Roster Analytics
* **Publishing Pipeline:** Clicking "Publish Course" updates the course status from `draft` to `published`, making it instantly visible on the student dashboard.
* **Roster Analytics Dashboard:** Instructors can import a student roster (`.csv`), track student participation rates, monitor quiz performance, and view time spent in interactive sandboxes[cite: 1].

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

The frontend application code and its Vite configuration are in `frontend/`. Route screens are in `frontend/src/routes/`, and shared Supabase and session utilities are in `frontend/src/lib/`.

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

The backend is currently a starter API with a single greeting endpoint. Database access, authentication, and AI features have not yet been added.

---

## ⚙️ Development & Formatting Conventions

### Project Structure
* `frontend/` — React application, Vite configuration, and frontend dependencies.
* `frontend/index.html` — Vite app entry point; mounts the React root.
* `frontend/src/main.tsx` — App bootstrap and top-level rendering.
* `frontend/src/routes/` — TanStack Router screens, including the home, login, student, and instructor routes.
* `frontend/src/routeTree.gen.ts` — Generated route tree used by TanStack Router.
* `frontend/src/lib/` — Shared session, Supabase client, and profile utilities.
* `frontend/src/styles.css` — Global styles and Tailwind CSS import.
* `frontend/public/` — Static frontend assets.
* `backend/app/main.py` — FastAPI application and its current greeting endpoint.
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
