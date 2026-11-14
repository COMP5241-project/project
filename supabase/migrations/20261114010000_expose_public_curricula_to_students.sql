create policy "Students read public published curricula"
  on public.instructor_courses
  for select
  to authenticated
  using (
    status = 'published'
    and visibility = 'public'
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'student'
    )
  );

create policy "Students read public published curriculum versions"
  on public.instructor_course_versions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.instructor_courses
      where instructor_courses.id = instructor_course_versions.course_id
        and instructor_courses.published_version_id = instructor_course_versions.id
        and instructor_courses.status = 'published'
        and instructor_courses.visibility = 'public'
        and exists (
          select 1 from public.profiles
          where profiles.id = (select auth.uid())
            and profiles.role = 'student'
        )
    )
  );
