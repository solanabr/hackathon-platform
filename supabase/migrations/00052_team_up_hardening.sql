-- Final-review hardening for team-up (final-review.md F3).
-- team_seekers is directly writable by authenticated with only an own-row
-- check, so a crafted PostgREST insert could post a seeker card in an
-- edition the caller isn't registered in, bypassing the server action's
-- profile-completeness gate. Tie the RLS policies and the board RPC's
-- seeker branch to hackathon_registrations, and revoke anon as
-- defense-in-depth (RLS already keys everything on auth.uid(), which is
-- null for anon, but the explicit revoke removes the ambiguity).

drop policy team_seekers_own_insert on public.team_seekers;
drop policy team_seekers_own_update on public.team_seekers;

create policy team_seekers_own_insert on public.team_seekers
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.hackathon_registrations r
      where r.user_id = (select auth.uid()) and r.hackathon_id = team_seekers.hackathon_id
    )
  );

create policy team_seekers_own_update on public.team_seekers
  for update using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.hackathon_registrations r
      where r.user_id = (select auth.uid()) and r.hackathon_id = team_seekers.hackathon_id
    )
  );

-- Board's seeker branch: re-check the seeker's own registration in the
-- board's edition, not just the caller's (base: 00051).
create or replace function public.team_up_board(p_hackathon_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_teams jsonb;
  v_seekers jsonb;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'not_authenticated'; end if;

  if not exists (
    select 1 from public.hackathon_registrations
    where user_id = v_user and hackathon_id = p_hackathon_id
  ) then
    raise exception 'not_registered';
  end if;

  select coalesce(jsonb_agg(row order by row->>'created_at' desc), '[]'::jsonb)
  into v_teams
  from (
    select jsonb_build_object(
      'team_id', t.id,
      'name', t.name,
      'description', t.description,
      'roles', o.roles,
      'note', o.note,
      'accepted_count', (
        select count(*) from public.team_members m
        where m.team_id = t.id and m.status = 'accepted'
      ),
      'leader_id', t.leader_id,
      'leader_name', u.full_name,
      'leader_avatar_url', u.avatar_url,
      'created_at', o.created_at
    ) as row
    from public.team_openings o
    join public.teams t on t.id = o.team_id
    join public.users u on u.id = t.leader_id
    where o.hackathon_id = p_hackathon_id
      and o.active
      and not t.locked
      and (
        select count(*) from public.team_members m
        where m.team_id = t.id and m.status = 'accepted'
      ) < 4
  ) teams_sub;

  select coalesce(jsonb_agg(row order by row->>'created_at' desc), '[]'::jsonb)
  into v_seekers
  from (
    select jsonb_build_object(
      'user_id', u.id,
      'full_name', u.full_name,
      'avatar_url', u.avatar_url,
      'headline', u.headline,
      'roles', s.roles,
      'note', s.note,
      'github_url', u.github_url,
      'twitter_url', u.twitter_url,
      'linkedin_url', u.linkedin_url,
      'telegram_handle', u.telegram_handle,
      'created_at', s.created_at
    ) as row
    from public.team_seekers s
    join public.users u on u.id = s.user_id
    where s.hackathon_id = p_hackathon_id
      and s.active
      and exists (
        select 1 from public.hackathon_registrations r
        where r.user_id = s.user_id and r.hackathon_id = p_hackathon_id
      )
      and not exists (
        select 1 from public.team_members m
        join public.teams t on t.id = m.team_id
        where m.user_id = s.user_id
          and m.status = 'accepted'
          and t.hackathon_id = p_hackathon_id
      )
  ) seekers_sub;

  return jsonb_build_object('teams', v_teams, 'seekers', v_seekers);
end;
$$;

revoke all on public.team_openings from anon;
revoke all on public.team_seekers from anon;
revoke all on public.team_applications from anon;
