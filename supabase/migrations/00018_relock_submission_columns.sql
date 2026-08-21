-- 00009 re-granted table-level UPDATE on submissions to authenticated, which
-- silently undid the column-scoped grant from 00006. Any member could PATCH
-- status='submitted' straight from the browser, skipping submit_team's
-- required-field, leader and Luma checks, and without locking the team.
-- Re-scope the grant, and give the update policy a WITH CHECK so the row still
-- has to belong to the caller's team after the write.

revoke update on public.submissions from authenticated;

grant update (
  project_name, description,
  pitch_url, pitch_deck_url, pitch_video_url, demo_video_url,
  github_url, github_access_granted, twitter_url, website_url,
  image_path, last_edited_by, updated_at
) on public.submissions to authenticated;

drop policy if exists "submissions_member_update" on public.submissions;
create policy "submissions_member_update" on public.submissions for update to authenticated
  using (
    public.is_active_team_member(team_id)
    and exists (
      select 1 from public.teams t
      join public.hackathons h on h.id = t.hackathon_id
      where t.id = submissions.team_id
        and t.locked = false
        and h.submission_deadline_at > now()
    )
  )
  with check (
    public.is_active_team_member(team_id)
    and exists (
      select 1 from public.teams t
      join public.hackathons h on h.id = t.hackathon_id
      where t.id = submissions.team_id
        and t.locked = false
        and h.submission_deadline_at > now()
    )
  );
