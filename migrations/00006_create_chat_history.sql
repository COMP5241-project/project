create table public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null
    references public."user"(id) on delete cascade,
  conversation_id uuid not null default gen_random_uuid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_history_user_conversation_created_at_idx
  on public.chat_history (user_id, conversation_id, created_at);

alter table public.chat_history enable row level security;
