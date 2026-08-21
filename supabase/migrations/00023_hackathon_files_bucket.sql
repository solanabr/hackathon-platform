-- Content is not only recorded video: slides, regulamento, worksheets. Admin
-- uploads through the service role, participants read.
insert into storage.buckets (id, name, public)
values ('hackathon-files', 'hackathon-files', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 25 * 1024 * 1024,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'hackathon-files';

drop policy if exists "hackathon_files_public_read" on storage.objects;
create policy "hackathon_files_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'hackathon-files');

insert into storage.buckets (id, name, public)
values ('hackathon-covers', 'hackathon-covers', true)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'hackathon-covers';

drop policy if exists "hackathon_covers_public_read" on storage.objects;
create policy "hackathon_covers_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'hackathon-covers');
