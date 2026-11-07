create table public.courses (
  id uuid primary key default gen_random_uuid(),
  created_by bigint not null
    references public."user"(id) on delete cascade,

  title text not null,
  description text,
  content text,
  status text not null default 'draft' check (
    status in ('draft', 'published')
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_created_by_created_at_idx
  on public.courses (created_by, created_at desc);

create index courses_published_created_at_idx
  on public.courses (created_at desc)
  where status = 'published';
