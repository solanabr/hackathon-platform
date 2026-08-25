-- Surface a PENDING team_members row to the invited user. The read policies on
-- team_members/teams only expose rows to accepted teammates, so a pending
-- invitee could not see the team they were added to. This RPC returns just the
-- team name and leader for the current user's pending membership in an
-- edition — enough for the painel's "você foi adicionado ao time" strip —
-- without widening the read policies.

create or replace function public.pending_membership_for_edition(p_hackathon_id uuid)
returns table (
  "teamId" uuid,
  "teamName" text,
  "leaderName" text,
  "leaderEmail" text,
  "locked" boolean,
  "full" boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.name,
    l.full_name,
    l.email,
    t.locked,
    (
      select count(*) from public.team_members fm
      where fm.team_id = t.id and fm.status = 'accepted'
    ) >= 4
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  join public.users l on l.id = t.leader_id
  where tm.user_id = auth.uid()
    and tm.hackathon_id = p_hackathon_id
    and tm.status = 'pending'
  limit 1;
$$;

revoke execute on function public.pending_membership_for_edition(uuid) from anon, public;
grant execute on function public.pending_membership_for_edition(uuid) to authenticated;
