-- Store results from the "Spot the Hallucination" code review game, where
-- students practise Discernment (4D AI Fluency framework) by critiquing
-- flawed AI-generated code. One row per challenge attempt.

create table if not exists public.hallucination_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_id text not null,
  score integer not null check (score between 0 and 100),
  critique text not null,
  feedback text,
  created_at timestamptz not null default now()
);

alter table public.hallucination_results enable row level security;

grant select, insert on public.hallucination_results to authenticated;

drop policy if exists "Users can view their own hallucination results" on public.hallucination_results;
create policy "Users can view their own hallucination results"
  on public.hallucination_results
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own hallucination results" on public.hallucination_results;
create policy "Users can insert their own hallucination results"
  on public.hallucination_results
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
