create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null check (type in ('slides', 'quiz', 'flashcards', 'summary')),
  data jsonb not null default '{}'::jsonb,
  chat_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_id_user_unique unique (id, user_id)
);

create index if not exists materials_user_updated_idx
  on public.materials (user_id, updated_at desc);

create table if not exists public.material_sources (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('file', 'url', 'text')),
  name text not null,
  raw_content text,
  source_url text,
  storage_path text,
  created_at timestamptz not null default now(),
  constraint material_sources_source_data check (
    (type = 'file' and storage_path is not null and raw_content is not null)
    or (type = 'url' and source_url is not null and raw_content is not null)
    or (type = 'text' and raw_content is not null)
  ),
  constraint material_sources_material_owner_fk
    foreign key (material_id, user_id)
    references public.materials (id, user_id)
    on delete cascade
);

create index if not exists material_sources_material_created_idx
  on public.material_sources (material_id, created_at);

alter table public.materials enable row level security;
alter table public.material_sources enable row level security;

grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update, delete on public.material_sources to authenticated;

drop policy if exists "Instructors manage their materials" on public.materials;
create policy "Instructors manage their materials"
  on public.materials
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

drop policy if exists "Instructors manage their material sources" on public.material_sources;
create policy "Instructors manage their material sources"
  on public.material_sources
  for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.materials
      where materials.id = material_id and materials.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.materials
      where materials.id = material_id and materials.user_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instructor-materials',
  'instructor-materials',
  false,
  5242880,
  array[
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Instructors manage their material files" on storage.objects;
create policy "Instructors manage their material files"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'instructor-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.materials
      where materials.id::text = (storage.foldername(name))[2]
        and materials.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'instructor-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.materials
      where materials.id::text = (storage.foldername(name))[2]
        and materials.user_id = (select auth.uid())
    )
  );
