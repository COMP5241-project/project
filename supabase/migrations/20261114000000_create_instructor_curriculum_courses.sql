create table public.instructor_courses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  title varchar(200) not null check (length(btrim(title)) > 0),
  description text not null check (length(btrim(description)) > 0),
  status varchar(16) not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  visibility varchar(16) not null default 'restricted'
    check (visibility in ('public', 'restricted')),
  default_presentation_format varchar(40) not null default 'text-and-images'
    check (
      default_presentation_format in (
        'text-and-images',
        'interactive-simulations',
        'interactive-role-play-activities',
        'games',
        'animations',
        'slides-based',
        'online-coding'
      )
    ),
  current_version_id uuid,
  published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint instructor_courses_published_state_check
    check (
      status <> 'published'
      or (published_at is not null and published_version_id is not null)
    ),
  constraint instructor_courses_draft_state_check
    check (status <> 'draft' or published_at is null)
);

create table public.instructor_course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null
    references public.instructor_courses(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  created_at timestamptz not null default now(),
  constraint instructor_course_versions_course_version_key
    unique (course_id, version_number),
  constraint instructor_course_versions_course_id_id_key
    unique (course_id, id)
);

alter table public.instructor_courses
  add constraint instructor_courses_current_version_fk
  foreign key (id, current_version_id)
  references public.instructor_course_versions(course_id, id);

alter table public.instructor_courses
  add constraint instructor_courses_published_version_fk
  foreign key (id, published_version_id)
  references public.instructor_course_versions(course_id, id);

create index instructor_courses_owner_updated_idx
  on public.instructor_courses (created_by, updated_at desc);

alter table public.instructor_courses enable row level security;
alter table public.instructor_course_versions enable row level security;

grant select on public.instructor_courses, public.instructor_course_versions
  to authenticated;

create policy "Instructors read their curriculum courses"
  on public.instructor_courses
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'instructor'
    )
  );

create policy "Instructors read their curriculum versions"
  on public.instructor_course_versions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.instructor_courses
      where instructor_courses.id = course_id
        and instructor_courses.created_by = (select auth.uid())
        and exists (
          select 1 from public.profiles
          where profiles.id = (select auth.uid())
            and profiles.role = 'instructor'
        )
    )
  );

create function public.save_instructor_course_draft(
  p_created_by uuid,
  p_title varchar,
  p_description text,
  p_default_presentation_format varchar,
  p_visibility varchar,
  p_plan jsonb,
  p_course_id uuid default null
)
returns table (course_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_course_id uuid;
  next_version_number integer;
  new_version_id uuid;
begin
  if auth.uid() is distinct from p_created_by
    or not exists (
      select 1 from public.profiles
      where profiles.id = p_created_by and profiles.role = 'instructor'
    )
  then
    raise exception 'instructor authorization required' using errcode = '42501';
  end if;

  if p_course_id is null then
    insert into public.instructor_courses (
      created_by,
      title,
      description,
      default_presentation_format,
      visibility
    )
    values (
      p_created_by,
      p_title,
      p_description,
      p_default_presentation_format,
      p_visibility
    )
    returning id into target_course_id;
  else
    select instructor_courses.id
      into target_course_id
      from public.instructor_courses
      where instructor_courses.id = p_course_id
        and instructor_courses.created_by = p_created_by
        and instructor_courses.status = 'draft'
      for update;

    if target_course_id is null then
      raise exception 'draft course not found' using errcode = 'P0002';
    end if;

    update public.instructor_courses
      set title = p_title,
          description = p_description,
          default_presentation_format = p_default_presentation_format,
          visibility = p_visibility,
          updated_at = now()
      where id = target_course_id;
  end if;

  select coalesce(max(versions.version_number), 0) + 1
    into next_version_number
    from public.instructor_course_versions as versions
    where versions.course_id = target_course_id;

  insert into public.instructor_course_versions (course_id, version_number, plan)
    values (target_course_id, next_version_number, p_plan)
    returning id into new_version_id;

  update public.instructor_courses
    set current_version_id = new_version_id,
        updated_at = now()
    where id = target_course_id;

  return query
    select target_course_id, new_version_id, next_version_number;
end;
$$;

create function public.publish_instructor_course(
  p_course_id uuid,
  p_created_by uuid
)
returns table (course_id uuid, status text, published_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_version_id uuid;
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

  update public.instructor_courses
    set status = 'published',
        published_version_id = current_version_id,
        published_at = now(),
        updated_at = now()
    where instructor_courses.id = p_course_id
      and instructor_courses.created_by = p_created_by
      and instructor_courses.status = 'draft'
      and instructor_courses.current_version_id is not null
    returning current_version_id, instructor_courses.published_at
      into target_version_id, target_published_at;

  if target_version_id is null then
    raise exception 'draft course not found' using errcode = 'P0002';
  end if;

  return query
    select p_course_id, 'published'::text, target_published_at;
end;
$$;

revoke all on function public.save_instructor_course_draft(
  uuid, varchar, text, varchar, varchar, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.save_instructor_course_draft(
  uuid, varchar, text, varchar, varchar, jsonb, uuid
) to authenticated;

revoke all on function public.publish_instructor_course(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.publish_instructor_course(uuid, uuid)
  to authenticated;
