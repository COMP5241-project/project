create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null
    references public."user"(id) on delete cascade,

  course_topic text not null,
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