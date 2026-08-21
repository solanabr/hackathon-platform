-- Editing the submission is the leader's job; other members read it. The policy
-- allowed any accepted member to update, so gating only the UI would leave the
-- write path open to a direct PATCH.

drop policy if exists "submissions_member_update" on public.submissions;

create policy "submissions_leader_update" on public.submissions for update to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.hackathons h on h.id = t.hackathon_id
      where t.id = submissions.team_id
        and t.leader_id = auth.uid()
        and t.locked = false
        and h.submission_deadline_at > now()
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      join public.hackathons h on h.id = t.hackathon_id
      where t.id = submissions.team_id
        and t.leader_id = auth.uid()
        and t.locked = false
        and h.submission_deadline_at > now()
    )
  );
