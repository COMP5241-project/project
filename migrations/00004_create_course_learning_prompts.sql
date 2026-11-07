create table public.course_learning_prompts (
  course_id uuid primary key
    references public.courses(id) on delete cascade,
  prompt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
