-- Fix for 20261029000000_roster_analytics.sql:
--
-- The "Instructors resolve their roster emails" policy on public.profiles
-- referenced public.profiles *inside its own USING clause*. Postgres applies
-- RLS to that inner scan as well, so evaluating the policy rescan triggers
-- the same policy again: 42P17 "infinite recursion detected in policy".
--
-- Because the broken policy sits on public.profiles, it broke every
-- authenticated read of that table — /api/profiles/me for all users, and any
-- query that scans profiles from another policy (e.g. the
-- "Students read published materials" policy on public.materials, which is
-- what the student course list uses).
--
-- The fix moves the "caller is an instructor" check into a SECURITY DEFINER
-- function (its owner bypasses RLS, so it never triggers the policy again)
-- and rewrites the policy so its subquery only touches rosters /
-- roster_students. Idempotent: safe to re-run.

create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'instructor'
  );
$$;

revoke execute on function public.is_instructor() from anon, public;
grant execute on function public.is_instructor() to authenticated;

drop policy if exists "Instructors resolve their roster emails" on public.profiles;
create policy "Instructors resolve their roster emails"
  on public.profiles
  for select
  to authenticated
  using (
    public.is_instructor()
    and exists (
      select 1
      from public.rosters r
      join public.roster_students rs on rs.roster_id = r.id
      where r.instructor_id = (select auth.uid())
        and lower(rs.email) = lower(profiles.email)
    )
  );
