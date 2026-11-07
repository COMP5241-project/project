create or replace function public.update_personalized_course(
  p_user_id bigint,
  p_course_id uuid,
  p_title text,
  p_description text,
  p_prompt text
)
returns table (
  id uuid,
  title text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  learning_prompt text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_course public.courses%rowtype;
begin
  select c.*
  into updated_course
  from public.courses as c
  where c.id = p_course_id
    and c.created_by = p_user_id
  for update;

  if not found then
    return;
  end if;

  update public.courses
  set
    title = p_title,
    description = p_description,
    content = p_prompt,
    updated_at = now()
  where courses.id = p_course_id
  returning * into updated_course;

  insert into public.course_learning_prompts (course_id, prompt, updated_at)
  values (p_course_id, p_prompt, now())
  on conflict (course_id) do update
  set prompt = excluded.prompt, updated_at = excluded.updated_at;

  return query
  select
    updated_course.id,
    updated_course.title,
    updated_course.description,
    updated_course.status,
    updated_course.created_at,
    updated_course.updated_at,
    p_prompt;
end;
$$;
