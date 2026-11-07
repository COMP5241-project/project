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

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null
    references public."user"(id) on delete cascade,

  course_id uuid not null
    references public.courses(id),
  presentation_format text not null check (
    presentation_format in (
      'text-and-images',
      'interactive-simulations',
      'interactive-role-play-activities',
      'games',
      'animations',
      'slides-based',
      'online-coding'
    )
  ),
  experience_level text not null check (
    experience_level in ('beginner', 'intermediate')
  ),

  learner_background text,
  learning_goal text,

  status text not null default 'generating' check (
    status in ('generating', 'ready', 'failed')
  ),
  content text,

  created_at timestamptz not null default now(),

  constraint learning_sessions_ready_content_check
    check (status <> 'ready' or content is not null)
);

create index learning_sessions_user_id_created_at_idx
  on public.learning_sessions (user_id, created_at desc);

create index learning_sessions_course_id_idx
  on public.learning_sessions (course_id);