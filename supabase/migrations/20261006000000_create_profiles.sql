create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'student' check (role in ('student', 'instructor')),
  cs_qualified boolean not null default false
);

alter table public.profiles
  add column if not exists cs_qualified boolean not null default false;

alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (cs_qualified) on public.profiles to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own CS qualification" on public.profiles;
create policy "Users can update their own CS qualification"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();