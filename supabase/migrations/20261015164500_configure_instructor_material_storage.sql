insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instructor-materials',
  'instructor-materials',
  false,
  5242880,
  array[
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Instructors manage their material files" on storage.objects;
create policy "Instructors manage their material files"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'instructor-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.materials
      where materials.id::text = (storage.foldername(name))[2]
        and materials.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'instructor-materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.materials
      where materials.id::text = (storage.foldername(name))[2]
        and materials.user_id = (select auth.uid())
    )
  );
