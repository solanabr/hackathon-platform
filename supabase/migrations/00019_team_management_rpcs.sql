-- Leaders had no way to remove a member, hand over leadership, or delete a team,
-- so a typo in an invited email or an abandoned team needed SQL to fix.
-- delete_team only accepts a team the leader is alone in and that is not yet
-- submitted; leave_team refuses the leader so a team never loses its owner.

create or replace function public.remove_team_member(p_member_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid; v_team_id uuid; v_is_leader boolean; v_leader_id uuid; v_locked boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select tm.team_id, tm.is_leader into v_team_id, v_is_leader
  from public.team_members tm where tm.id = p_member_id;

  if v_team_id is null then raise exception 'member_not_found'; end if;
  if v_is_leader then raise exception 'cannot_remove_leader'; end if;

  select t.leader_id, t.locked into v_leader_id, v_locked
  from public.teams t where t.id = v_team_id;

  if v_leader_id <> v_user_id then raise exception 'not_leader'; end if;
  if v_locked then raise exception 'team_locked'; end if;

  delete from public.team_members where id = p_member_id;
end;
$$;

create or replace function public.transfer_team_leadership(p_team_id uuid, p_new_leader_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid; v_leader_id uuid; v_locked boolean; v_ok int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select leader_id, locked into v_leader_id, v_locked
  from public.teams where id = p_team_id for update;

  if v_leader_id is null then raise exception 'team_not_found'; end if;
  if v_leader_id <> v_user_id then raise exception 'not_leader'; end if;
  if v_locked then raise exception 'team_locked'; end if;
  if p_new_leader_id = v_user_id then raise exception 'already_leader'; end if;

  select count(*) into v_ok from public.team_members
  where team_id = p_team_id and user_id = p_new_leader_id and status = 'accepted';
  if v_ok = 0 then raise exception 'not_a_member'; end if;

  update public.teams set leader_id = p_new_leader_id where id = p_team_id;
  update public.team_members set is_leader = false where team_id = p_team_id;
  update public.team_members set is_leader = true
  where team_id = p_team_id and user_id = p_new_leader_id;
end;
$$;

create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid; v_leader_id uuid; v_locked boolean; v_others int; v_status text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select leader_id, locked into v_leader_id, v_locked
  from public.teams where id = p_team_id for update;

  if v_leader_id is null then raise exception 'team_not_found'; end if;
  if v_leader_id <> v_user_id then raise exception 'not_leader'; end if;
  if v_locked then raise exception 'team_locked'; end if;

  select count(*) into v_others from public.team_members
  where team_id = p_team_id and status = 'accepted' and user_id <> v_user_id;
  if v_others > 0 then raise exception 'team_not_empty'; end if;

  select status into v_status from public.submissions where team_id = p_team_id;
  if v_status = 'submitted' then raise exception 'already_submitted'; end if;

  delete from public.teams where id = p_team_id;
end;
$$;

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid; v_leader_id uuid; v_locked boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not_authenticated'; end if;

  select leader_id, locked into v_leader_id, v_locked
  from public.teams where id = p_team_id;

  if v_leader_id is null then raise exception 'team_not_found'; end if;
  if v_locked then raise exception 'team_locked'; end if;
  if v_leader_id = v_user_id then raise exception 'leader_must_transfer_first'; end if;

  delete from public.team_members where team_id = p_team_id and user_id = v_user_id;
end;
$$;

revoke execute on function public.remove_team_member(uuid) from anon, public;
revoke execute on function public.transfer_team_leadership(uuid, uuid) from anon, public;
revoke execute on function public.delete_team(uuid) from anon, public;
revoke execute on function public.leave_team(uuid) from anon, public;

grant execute on function public.remove_team_member(uuid) to authenticated;
grant execute on function public.transfer_team_leadership(uuid, uuid) to authenticated;
grant execute on function public.delete_team(uuid) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
