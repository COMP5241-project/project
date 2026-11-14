create table if not exists public.backend_sessions (
  session_hash text primary key
    check (session_hash ~ '^[0-9a-f]{64}$'),
  session_generation uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  expires_at timestamptz not null,
  lock_id uuid,
  lock_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists backend_sessions_user_id_idx
  on public.backend_sessions (user_id);

create index if not exists backend_sessions_expires_at_idx
  on public.backend_sessions (expires_at);

alter table public.backend_sessions enable row level security;

revoke all on public.backend_sessions from public, anon, authenticated;
grant all on public.backend_sessions to service_role;

create or replace function public.acquire_backend_session_lock(
  p_session_hash text,
  p_lock_id uuid,
  p_lock_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.backend_sessions
  set
    lock_id = p_lock_id,
    lock_expires_at = pg_catalog.clock_timestamp()
      + pg_catalog.make_interval(secs => greatest(1, least(p_lock_seconds, 120)))
  where session_hash = p_session_hash
    and expires_at > pg_catalog.clock_timestamp()
    and (
      lock_expires_at is null
      or lock_expires_at <= pg_catalog.clock_timestamp()
    );

  return found;
end;
$$;

create or replace function public.release_backend_session_lock(
  p_session_hash text,
  p_lock_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.backend_sessions
  set lock_id = null, lock_expires_at = null
  where session_hash = p_session_hash
    and lock_id = p_lock_id;

  return found;
end;
$$;

revoke all on function public.acquire_backend_session_lock(text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.acquire_backend_session_lock(text, uuid, integer)
  to service_role;

revoke all on function public.release_backend_session_lock(text, uuid)
  from public, anon, authenticated;
grant execute on function public.release_backend_session_lock(text, uuid)
  to service_role;
