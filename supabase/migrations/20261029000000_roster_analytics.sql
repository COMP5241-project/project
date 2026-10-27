-- Roster import & participation analytics.
-- Instructors import a CSV roster (name,email); matching roster emails are
-- linked to signed-up accounts, and student activity (course progress +
-- quiz answers) is aggregated per roster.

create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists rosters_instructor_idx
  on public.rosters (instructor_id, created_at desc);

alter table public.rosters enable row level security;

grant select, insert, delete on public.rosters to authenticated;

drop policy if exists "Instructors manage their rosters" on public.rosters;
create policy "Instructors manage their rosters"
  on public.rosters
  for all
  to authenticated
  using ((select auth.uid()) = instructor_id)
  with check ((select auth.uid()) = instructor_id);

create table if not exists public.roster_students (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null check (char_length(email) between 3 and 320),
  name text not null check (char_length(name) between 1 and 300),
  imported_at timestamptz not null default now()
);

-- Re-importing a roster refreshes each student's name and account match;
-- one row per (roster, email) case-insensitively.
create unique index if not exists roster_students_roster_email_idx
  on public.roster_students (roster_id, lower(email));

alter table public.roster_students enable row level security;

grant select, insert, update, delete on public.roster_students to authenticated;

drop policy if exists "Instructors manage their roster students" on public.roster_students;
create policy "Instructors manage their roster students"
  on public.roster_students
  for all
  to authenticated
  using (
    exists (
      select 1 from public.rosters
      where rosters.id = roster_id
        and rosters.instructor_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.rosters
      where rosters.id = roster_id
        and rosters.instructor_id = (select auth.uid())
    )
  );

-- Instructors may read course progress / quiz answers, but only for the
-- students enrolled in one of their own rosters (keeps analytics scoped
-- without a service-role key).
drop policy if exists "Instructors view their roster students' progress" on public.course_progress;
create policy "Instructors view their roster students' progress"
  on public.course_progress
  for select
  to authenticated
  using (
    exists (
      select 1 from public.rosters
      where rosters.instructor_id = (select auth.uid())
        and rosters.id in (
          select rs.roster_id from public.roster_students rs where rs.user_id = course_progress.user_id
        )
    )
  );

drop policy if exists "Instructors view their roster students' quiz answers" on public.course_quiz_answers;
create policy "Instructors view their roster students' quiz answers"
  on public.course_quiz_answers
  for select
  to authenticated
  using (
    exists (
      select 1 from public.rosters
      where rosters.instructor_id = (select auth.uid())
        and rosters.id in (
          select rs.roster_id from public.roster_students rs where rs.user_id = course_quiz_answers.user_id
        )
    )
  );

-- Instructors may resolve roster emails to account ids, but only for rows
-- whose email appears in one of their own rosters.
drop policy if exists "Instructors resolve their roster emails" on public.profiles;
create policy "Instructors resolve their roster emails"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'instructor'
        and p.id in (
          select r.instructor_id
          from public.rosters r
          join public.roster_students rs on rs.roster_id = r.id
          where lower(rs.email) = lower(profiles.email)
        )
    )
  );

-- Analytics joins need course titles; published materials are already
-- shareable content, so any authenticated user may see their rows.
drop policy if exists "Published courses are visible to authenticated users" on public.materials;
create policy "Published courses are visible to authenticated users"
  on public.materials
  for select
  to authenticated
  using (published = true);
