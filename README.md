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

#### A1. Role-Based Authentication & Database Router
* **User Flow:** Users log in using their credentials on the `index.html` landing page.
* **Backend Infrastructure:** Powered by **Supabase** (PostgreSQL & Auth). Replaces hardcoded client-side email checks with secure, database-driven authentication to manage multiple demo accounts.
* **Validation & Routing Logic:**
  1. The frontend securely authenticates the user via the Supabase Auth API (`signInWithPassword`).
  2. Upon successful login, the system queries a dedicated `profiles` table in the Supabase database using the authenticated User ID to fetch the specific account role.
  3. **Student Routing:** If the database returns `role: 'student'`, the system redirects the user to the Diagnostic Onboarding assessment or directly to the learner hub (`student.html`)[cite: 1].
  4. **Instructor Routing:** If the database returns `role: 'instructor'`, the system redirects the user to the Instructor Studio (`instructor.html`)[cite: 1].
  5. 
#### A2. Diagnostic Debugging Assessment (Background Profiling)
* **Objective:** Automatically determine whether a student should follow the **CS Major Track** or **Non-CS Major Track** without filling out manual survey forms.
* **Mechanic:** A 2-minute diagnostic minigame presenting a broken code snippet (e.g., an off-by-one array error or missing API parameter).
* **Branching Logic:**
  * **Pass (Bug Fixed Correctly):** Profile set to `CS_TRACK`. System unlocks high-complexity architecture, system design, and AI code review modules[cite: 1].
  * **Fail / Skip:** Profile set to `NON_CS_TRACK`. System unlocks concept-first pathways, plain-English prompt engineering games, and intuitive analogies[cite: 1].
* **Manual Override:** Students can manually toggle between "CS Major" and "Non-CS Major" modes at any time via their profile header.

---

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
* **Code Review Boss Battle (CS Track):** The AI generates a Pull Request containing subtle memory leaks or security flaws. The CS student must identify the flaw, reject the PR, and provide constructive code review comments[cite: 1].
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

## ⚙️ 3. Development & Formatting Conventions

### File Structure & Naming
* `index.html` — Landing page & authentication router.
* `student.html` — Student dashboard & gamified skill tree.
* `instructor.html` — Instructor Studio (NotebookLM generator & roster analytics).
* `sandbox.html` — Interactive split-screen role-play & code sandbox.
* `ai_fluency_log.md` — Shared team log for Anthropic 4D AI Fluency documentation.

### Single-File HTML & Tailwind Setup
* Include Tailwind CSS via CDN in all HTML files:
  ```html
  <script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            polyred: '#A21942',
            polydark: '#262626',
          }
        }
      }
    }
  </script>
