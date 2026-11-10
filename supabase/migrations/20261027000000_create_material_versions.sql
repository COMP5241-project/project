-- Version snapshots of instructor materials so destructive edits (AI
-- revisions, bulk theme changes) and restores can be rolled back.
-- One row per snapshot; created explicitly by the backend before destructive
-- operations and when an instructor saves a version manually.

create table if not exists public.material_versions (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  data jsonb not null,
  label text not null default 'Snapshot',
  created_at timestamptz not null default now(),
  constraint material_versions_material_owner_fk
    foreign key (material_id, user_id)
    references public.materials (id, user_id)
    on delete cascade
);

create index if not exists material_versions_material_created_idx
  on public.material_versions (material_id, created_at desc);

alter table public.material_versions enable row level security;

grant select, insert on public.material_versions to authenticated;

drop policy if exists "Instructors manage their material versions" on public.material_versions;
create policy "Instructors manage their material versions"
  on public.material_versions
  for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'instructor'
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'instructor'
    )
  );
