# PolyU Supabase Auth Module

A secure authentication module built with **Supabase Auth**, **Tailwind CSS**, and adhering to the **PolyU Brand Design System**.

---

## 🚀 Getting Started

### 1. Installation

Install the required dependencies:

```bash
npm install
```

### 2. Configure Supabase

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env` (or `.env.local`). These are browser-safe project settings; never use a Supabase secret or service-role key here.

In the Supabase SQL Editor, run [`supabase/migrations/20261006000000_create_profiles.sql`](supabase/migrations/20261006000000_create_profiles.sql). New Auth users receive a `student` profile with `cs_qualified` set to `false`. Promote instructors by changing their `profiles.role` from a trusted administrative context.

### 3. Run locally

```bash
npm run dev
```

The login router sends students to `/student.html` and instructors to `/instructor.html`. After the student diagnostic, students are routed to `/student-cs.html` (Advanced Track) if they pass either round, or `/student-non-cs.html` (Introductory Track) if they skip or do not pass.

To verify a production build:

```bash
npm run build
```
