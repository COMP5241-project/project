---
date: 2026-10-08
tool: GitHub Copilot
target_file: src/routes/index.tsx
status: Implemented
---

Act as a Senior Frontend Engineer. I need to build a modern, high-converting, accessible landing page for an AI-empowered educational platform called "PolyU Education 4.0". 

### Tech Stack & Architecture Constraints
- **Framework & Language**: React 18+ with TypeScript (Strict mode, fully typed props and interfaces).
- **Routing**: TanStack Router (File-based routing using `createFileRoute('/')`). Place the route component in `src/routes/index.tsx`.
- **Styling**: Tailwind CSS (Utility-first, responsive `sm`/`md`/`lg`/`xl`, clean dark/light UI contrast, accessible color ratios).
- **Icons**: Use `lucide-react` icons.

---

### Key Product Context & Value Proposition
- **Product Name**: PolyU Education 4.0 Platform
- **Core Vision**: Transform university teaching and learning into a student-centered, AI-empowered, and personalized experience.
- **Dual Target Audiences**:
  1. **Non-CS Majors**: Lowers the barrier to turning software ideas into reality using AI coding agents without mastering syntax or frameworks first.
  2. **CS Majors & Graduates**: Elevates skills from writing raw syntax to higher-order AI fluency—problem framing, system architecture, prompt engineering, output discernment, and orchestrating agentic workflows.
- **Core Platform Features**:
  - Mini-courses with interactive simulations, mini-games, and online coding environments.
  - Personalized AI tutor tailors path & content by background and learning goals.
  - Instructor dashboard to generate/customize courses manually or via AI, import students, and track engagement.
  - Anthropic AI Fluency 4D Framework Integration (Delegation, Description, Discernment, Diligence).

---

### Required Landing Page Structure & Components

1. **Header / Navigation (`<Navbar />`)**
   - Brand Logo ("PolyU Edu 4.0" badge)
   - Nav links: "Features", "For Non-CS", "For CS Majors", "AI Fluency Framework", "Instructors"
   - CTA Buttons: "Student Login" (Secondary/Ghost), "Get Started" (Primary Call-to-Action)

2. **Hero Section (`<Hero />`)**
   - Eye-catching headline emphasizing AI-empowered, personalized learning.
   - Subtitle explaining how non-CS students build software fast while CS students master high-level system design & AI orchestration.
   - Dual CTAs: "Explore Mini-Courses" (Primary) and "Watch 2-Min Demo" (Secondary/Video trigger).
   - Social proof badge / stats banner (e.g., "AI-Powered", "Personalized Paths", "Interactive Coding Sandbox").

3. **Audience Toggle / Segmented Value Section (`<TargetAudienceSection />`)**
   - Interactive tab bar or split-card layout comparing:
     - **Non-Computer Science Learners**: Focus on turning ideas into software, quick iteration, zero syntax friction.
     - **CS Graduates & Developers**: Focus on Problem Framing, System Design, AI Output Evaluation, and Agent Workflows.

4. **Interactive Feature Showcase Grid (`<FeaturesGrid />`)**
   - Interactive Mini-Courses & Coding Sandbox
   - Tailored AI Learning Paths
   - Instructor AI Course Creator & Analytics
   - AI Fluency 4D Integration (Delegation, Description, Discernment, Diligence)

5. **AI Fluency Spotlight Section (`<AIFluencySection />`)**
   - Clean breakdown of Anthropic's 4D Framework:
     - **Delegation**: Deciding what to hand off to AI.
     - **Description**: Clearly specifying goals, constraints, and process.
     - **Discernment**: Critically evaluating AI outputs and reasoning.
     - **Diligence**: Verifying code, documenting, and taking accountability.

6. **Interactive Demo / Course Preview Component (`<InteractivePreview />`)**
   - A mock preview card of a mini-course (e.g., "Fundamentals of AI-Assisted Software Engineering") showing interactive modules: Simulations, Mock Role-Play, AI-narrated slides, and Live Code Editor preview.

7. **Call to Action & Footer (`<CTASection />`, `<Footer />`)**
   - Bold closing CTA banner for students and instructors.
   - Clean footer with navigation links, copyright, and platform tags.

---

### Implementation Instructions for Copilot
1. Create cleanly structured React functional components for each section using TypeScript.
2. Define explicit TypeScript interfaces for all section data/props (e.g., `FeatureCardProps`, `AudienceTabProps`).
3. Ensure stateful components (like tab switching between CS vs Non-CS) use standard React `useState`.
4. Implement TanStack Router file route structure in `src/routes/index.tsx` using `createFileRoute('/')`.
5. Ensure responsive mobile-first Tailwind design (`flex`, `grid grid-cols-1 md:grid-cols-3`, `gap-6`, `p-4 md:p-8`).

Write out the full code for `src/routes/index.tsx` (or modularized component code) cleanly.