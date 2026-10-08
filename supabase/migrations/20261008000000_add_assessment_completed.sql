-- Track whether a student has completed the one-time CS qualification
-- diagnostic assessment, so they are not asked to redo it on every login.

alter table public.profiles
  add column if not exists assessment_completed boolean not null default false;

grant update (assessment_completed) on public.profiles to authenticated;

-- Backfill: users who are already CS qualified have necessarily completed
-- the diagnostic assessment, so mark them as completed as well.
update public.profiles
set assessment_completed = true
where cs_qualified = true;
