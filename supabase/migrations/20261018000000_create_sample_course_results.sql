-- Store completion results from the public sample mini-course
-- ("Fundamentals of AI-Assisted Software Engineering") for signed-in
-- students. Guests can play the course but never persist anything. One row
-- per completed run.

create table if not exists public.sample_course_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  overall_score integer not null check (overall_score between 0 and 100),
  simulation_score integer not null check (simulation_score between 0 and 100),
  quiz_score integer not null check (quiz_score between 0 and 100),
  bot_score integer not null check (bot_score between 0 and 100),
  prompt_compare_score integer check (prompt_compare_score between 0 and 100),
  reflection_score integer check (reflection_score between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.sample_course_results enable row level security;

grant select, insert on public.sample_course_results to authenticated;

drop policy if exists "Users can view their own sample course results" on public.sample_course_results;
create policy "Users can view their own sample course results"
  on public.sample_course_results
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own sample course results" on public.sample_course_results;
create policy "Users can insert their own sample course results"
  on public.sample_course_results
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);