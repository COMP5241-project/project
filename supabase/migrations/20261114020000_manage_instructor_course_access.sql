create table public.instructor_course_access (
  course_id uuid not null
    references public.instructor_courses(id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  granted_by uuid not null references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

create index instructor_course_access_user_idx
  on public.instructor_course_access (user_id, course_id);

alter table public.instructor_course_access enable row level security;

grant select on public.instructor_course_access to authenticated;

create policy "Students read their curriculum access grants"
  on public.instructor_course_access
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'student'
    )
  );

create policy "Students read published restricted curricula shared with them"
  on public.instructor_courses
  for select
  to authenticated
  using (
    status = 'published'
    and visibility = 'restricted'
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'student'
    )
    and exists (
      select 1 from public.instructor_course_access
      where instructor_course_access.course_id = instructor_courses.id
        and instructor_course_access.user_id = (select auth.uid())
    )
  );

create policy "Students read published restricted versions shared with them"
  on public.instructor_course_versions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.instructor_courses
      where instructor_courses.id = instructor_course_versions.course_id
        and instructor_courses.published_version_id = instructor_course_versions.id
        and instructor_courses.status = 'published'
        and instructor_courses.visibility = 'restricted'
        and exists (
          select 1 from public.profiles
          where profiles.id = (select auth.uid())
            and profiles.role = 'student'
        )
        and exists (
          select 1 from public.instructor_course_access
          where instructor_course_access.course_id = instructor_courses.id
            and instructor_course_access.user_id = (select auth.uid())
        )
    )
  );

create function public.set_instructor_course_visibility(
  p_course_id uuid,
  p_created_by uuid,
  p_visibility varchar
)
returns table (course_id uuid, visibility text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_course_id uuid;
begin
  if auth.uid() is distinct from p_created_by
    or not exists (
      select 1 from public.profiles
      where profiles.id = p_created_by and profiles.role = 'instructor'
    )
  then
    raise exception 'instructor authorization required' using errcode = '42501';
  end if;

  update public.instructor_courses
    set visibility = p_visibility,
        updated_at = now()
    where instructor_courses.id = p_course_id
      and instructor_courses.created_by = p_created_by
    returning instructor_courses.id into target_course_id;

  if target_course_id is null then
    raise exception 'course not found' using errcode = 'P0002';
  end if;

  return query select target_course_id, p_visibility::text;
end;
$$;

create function public.set_instructor_course_status(
  p_course_id uuid,
  p_created_by uuid,
  p_status varchar
)
returns table (course_id uuid, status text, published_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_course_id uuid;
  target_published_at timestamptz;
begin
  if auth.uid() is distinct from p_created_by
    or not exists (
      select 1 from public.profiles
      where profiles.id = p_created_by and profiles.role = 'instructor'
    )
  then
    raise exception 'instructor authorization required' using errcode = '42501';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'unsupported course status' using errcode = '22023';
  end if;

  if p_status = 'published' then
    update public.instructor_courses
      set status = 'published',
          published_version_id = current_version_id,
          published_at = coalesce(instructor_courses.published_at, now()),
          updated_at = now()
      where instructor_courses.id = p_course_id
        and instructor_courses.created_by = p_created_by
        and instructor_courses.current_version_id is not null
      returning instructor_courses.id, instructor_courses.published_at
        into target_course_id, target_published_at;
  else
    update public.instructor_courses
      set status = 'draft',
          published_version_id = null,
          published_at = null,
          updated_at = now()
      where instructor_courses.id = p_course_id
        and instructor_courses.created_by = p_created_by
      returning instructor_courses.id, instructor_courses.published_at
        into target_course_id, target_published_at;
  end if;

  if target_course_id is null then
    raise exception 'course not found or has no saved version' using errcode = 'P0002';
  end if;

  return query
    select target_course_id, p_status::text, target_published_at;
end;
$$;

create function public.list_instructor_course_access(
  p_course_id uuid,
  p_created_by uuid
)
returns table (user_id uuid, email text, granted_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is distinct from p_created_by
    or not exists (
      select 1 from public.profiles
      where profiles.id = p_created_by and profiles.role = 'instructor'
    )
  then
    raise exception 'instructor authorization required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.instructor_courses
    where instructor_courses.id = p_course_id
      and instructor_courses.created_by = p_created_by
  ) then
    raise exception 'course not found' using errcode = 'P0002';
  end if;

  return query
    select access.user_id, profiles.email, access.granted_at
      from public.instructor_course_access as access
      join public.profiles on profiles.id = access.user_id
      where access.course_id = p_course_id
      order by access.granted_at;
end;
$$;

create function public.grant_instructor_course_access(
  p_course_id uuid,
  p_created_by uuid,
  p_email text
)
returns table (user_id uuid, email text, granted_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
  target_email text;
  target_granted_at timestamptz;
begin
  if auth.uid() is distinct from p_created_by
    or not exists (
      select 1 from public.profiles
      where profiles.id = p_created_by and profiles.role = 'instructor'
    )
  then
    raise exception 'instructor authorization required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.instructor_courses
    where instructor_courses.id = p_course_id
      and instructor_courses.created_by = p_created_by
      and instructor_courses.status = 'published'
      and instructor_courses.visibility = 'restricted'
  ) then
    raise exception 'restricted published course not found' using errcode = 'P0002';
  end if;

  select profiles.id, profiles.email
    into target_user_id, target_email
    from public.profiles
    where lower(profiles.email) = lower(btrim(p_email))
      and profiles.role = 'student'
    limit 1;

  if target_user_id is null then
    raise exception 'student account not found' using errcode = 'P0002';
  end if;

  insert into public.instructor_course_access (course_id, user_id, granted_by)
    values (p_course_id, target_user_id, p_created_by)
    on conflict (course_id, user_id) do nothing;

  select access.granted_at
    into target_granted_at
    from public.instructor_course_access as access
    where access.course_id = p_course_id
      and access.user_id = target_user_id;

  return query select target_user_id, target_email, target_granted_at;
end;
$$;

create function public.revoke_instructor_course_access(
  p_course_id uuid,
  p_created_by uuid,
  p_user_id uuid
)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user_id uuid;
begin
  if auth.uid() is distinct from p_created_by
    or not exists (
      select 1 from public.profiles
      where profiles.id = p_created_by and profiles.role = 'instructor'
    )
  then
    raise exception 'instructor authorization required' using errcode = '42501';
  end if;

  delete from public.instructor_course_access as access
    using public.instructor_courses as course
    where access.course_id = p_course_id
      and access.user_id = p_user_id
      and course.id = access.course_id
      and course.created_by = p_created_by
    returning access.user_id into target_user_id;

  if target_user_id is null then
    raise exception 'course access grant not found' using errcode = 'P0002';
  end if;

  return query select target_user_id;
end;
$$;

revoke all on function public.set_instructor_course_visibility(uuid, uuid, varchar)
  from public, anon, authenticated;
grant execute on function public.set_instructor_course_visibility(uuid, uuid, varchar)
  to authenticated;

revoke all on function public.set_instructor_course_status(uuid, uuid, varchar)
  from public, anon, authenticated;
grant execute on function public.set_instructor_course_status(uuid, uuid, varchar)
  to authenticated;

revoke all on function public.list_instructor_course_access(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.list_instructor_course_access(uuid, uuid)
  to authenticated;

revoke all on function public.grant_instructor_course_access(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.grant_instructor_course_access(uuid, uuid, text)
  to authenticated;

revoke all on function public.revoke_instructor_course_access(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_instructor_course_access(uuid, uuid, uuid)
  to authenticated;
