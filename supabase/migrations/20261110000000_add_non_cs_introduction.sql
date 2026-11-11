alter table public.profiles
  add column if not exists non_cs_introduction_completed boolean not null default false;

grant update (non_cs_introduction_completed) on public.profiles to authenticated;
