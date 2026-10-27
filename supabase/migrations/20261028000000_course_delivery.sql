-- Student delivery pipeline: instructors publish materials so students can
-- view slides and sit quizzes; students' answers and progress are recorded
-- (one row per attempt / per course) to power roster analytics.

alter table public.materials
  add column if not exists published boolean not null default false;

alter table public.materials
  add column if not exists published_at timestamptz;

-- Students may READ published materials (their own JWT is used server-side,
-- so this policy is what makes the read available). Instructors keep their
-- existing full-access owner policy; publishing never grants write access.
drop policy if exists "Students read published materials" on public.materials;
create policy "Students read published materials"
  on public.materials
  for select
  to authenticated
  using (
    published = true
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'student'
    )
  );

-- One row per quiz answer a student submits for a published course.
create table if not exists public.course_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  question_id text not null,
  selected_index integer not null check (selected_index between 0 and 5),
  correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists course_quiz_answers_user_material_idx
  on public.course_quiz_answers (user_id, material_id, created_at);

alter table public.course_quiz_answers enable row level security;

grant select, insert on public.course_quiz_answers to authenticated;

drop policy if exists "Students record their own quiz answers" on public.course_quiz_answers;
create policy "Students record their own quiz answers"
  on public.course_quiz_answers
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- One row per (student, course) tracking engagement: when they started,
-- when they were last active, and when (if ever) they completed it.
create table if not exists public.course_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, material_id)
);

alter table public.course_progress enable row level security;

grant select, insert, update on public.course_progress to authenticated;

drop policy if exists "Students track their own course progress" on public.course_progress;
create policy "Students track their own course progress"
  on public.course_progress
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
