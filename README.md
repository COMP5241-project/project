# EduGenAI — PolyU GenAI-Powered Software Engineering Platform

> **PolyU Education 4.0 Initiative**: A student-centered, AI-empowered learning platform designed to deliver personalized, gamified, and interactive software engineering education for both non-CS and CS students[span_1](start_span)[span_1](end_span).

---

## 🎨 1. Design System & Style Guidelines

To maintain visual consistency across all team members' contributions, all pages must adhere to the official PolyU brand design rules:

### Color Palette
* **Primary (PolyU Brick Red):** `#A21942` (`bg-[#A21942]`, `text-[#A21942]`)
* **Secondary (Dark Slate/Charcoal):** `#262626` (`bg-[#262626]`, `text-[#262626]`)
* **Background Accent (Light Grey):** `#F8F9FA` (`bg-slate-50` or `#F8F9FA`)
* **Card Borders / Dividers:** `#E5E7EB` (`border-gray-200`)
* **Success / Progress Green:** `#10B981` (`bg-emerald-500`)

### Typography & Layout Rules
* **Font Family:** Sans-serif (`Inter`, `system-ui`, or Tailwind default sans).
* **Layout Grid:** Single-page responsiveness using Tailwind CSS CDN. Maximum content width set to `max-w-7xl mx-auto px-4`.
* **Component Styling:**
  * **Buttons:** Primary buttons must use PolyU Brick Red (`bg-[#A21942] text-white hover:bg-[#801333] rounded-md px-4 py-2`).
  * **Cards:** White background with subtle borders (`bg-white rounded-lg border border-gray-200 shadow-sm p-6`).
  * **Badges:** Small rounded tags for roles (`Student`: `bg-red-50 text-[#A21942]`, `Instructor`: `bg-gray-100 text-gray-800`).

---

## 🚀 2. Core Feature Matrix & Roadmap

| Module | Core Feature | Target Audience | AI Capability |
| :--- | :--- | :--- | :--- |
| **Auth & Routing** | Role-Based Portal Access | All | Routes `@connect.polyu.hk` to Student Hub and `@polyu.edu.hk` to Instructor Studio[span_2](start_span)[span_2](end_span). |
| **Student Hub** | Gamified Skill Tree | Learners | Adapts learning path nodes based on Non-CS vs. CS background selection[span_3](start_span)[span_3](end_span). |
| **Sandbox** | Toxic Stakeholder Role-Play | Learners | AI acts as a demanding Product Manager requiring scope negotiation[span_4](start_span)[span_4](end_span). |
| **Sandbox** | Code Review Boss Battle | Learners | AI acts as "Senior Dev" evaluating code submitted in the embedded editor[span_5](start_span)[span_5](end_span). |
| **Instructor Studio**| Prompt-to-Course Generator | Instructors | Generates 3-module mini-courses in structured JSON format[span_6](start_span)[span_6](end_span). |
| **Instructor Studio**| Student Engagement Tracker | Instructors | Displays activity logs, completion percentages, and quiz scores[span_7](start_span)[span_7](end_span). |

---

## ⚙️ 3. Development & Formatting Conventions

### File Naming Convention
* Page files: `lowercase-with-hyphens.html` (e.g., `index.html`, `student.html`, `instructor.html`, `sandbox.html`).
* JavaScript helper scripts: `main.js`, `auth.js`.

### Single-File HTML Standards
* Use **Tailwind CSS CDN** for rapid layout styling without complex npm build setups:
  ```html
  <script src="[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)"></script>
