create or replace function public.create_personalized_learning_session(
  p_user_id bigint,
  p_title text,
  p_description text,
  p_prompt text,
  p_presentation_format text,
  p_experience_level text
)
returns table (course_id uuid, session_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_course_id uuid;
  created_session_id uuid;
begin
  insert into public.courses (created_by, title, description, content, status)
  values (p_user_id, p_title, p_description, p_prompt, 'draft')
  returning id into created_course_id;

  insert into public.course_learning_prompts (course_id, prompt)
  values (created_course_id, p_prompt);

  insert into public.learning_sessions (
    user_id,
    course_id,
    presentation_format,
    experience_level,
    learning_goal,
    status,
    content
  )
  values (
    p_user_id,
    created_course_id,
    p_presentation_format,
    p_experience_level,
    p_description,
    'ready',
    p_prompt
  )
  returning id into created_session_id;

  return query select created_course_id, created_session_id;
end;
$$;
