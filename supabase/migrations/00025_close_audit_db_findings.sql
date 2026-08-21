-- Audit follow-up: the two findings the reviewer could only infer, plus the
-- anon grants that made the first one possible to reach.

-- 1. handle_new_user auto-accepted the oldest pending invite with none of the
--    checks accept_team_invite makes. A member added by email just before the
--    leader submits would join a locked, already-submitted team on signup.
--    The trigger runs inside the auth signup transaction, so an ineligible
--    invite is left pending rather than raised: the account is still created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_login text;
begin
  v_login := nullif(new.raw_user_meta_data->>'user_name', '');

  insert into public.users (id, email, full_name, avatar_url, github_url)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    case when v_login is null then null else 'https://github.com/' || v_login end
  )
  on conflict (id) do nothing;

  update public.team_members
  set user_id = new.id
  where user_id is null
    and lower(invited_email) = lower(new.email);

  update public.team_members
  set status = 'accepted', accepted_at = now()
  where id = (
    select tm.id
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = new.id
      and tm.status = 'pending'
      and t.locked = false
      and (
        select count(*) from public.team_members full_check
        where full_check.team_id = tm.team_id and full_check.status = 'accepted'
      ) < 4
    order by tm.invited_at asc
    limit 1
  );

  return new;
end;
$$;

-- 2. Nothing but the column-level GRANT stopped a leader from PATCHing
--    status='submitted' straight past submit_team's required-field and Luma
--    checks. 00009 already widened that grant once by accident. A policy cannot
--    compare OLD to NEW, so the guard goes in a trigger and holds regardless of
--    what the grants say. SECURITY DEFINER callers (submit_team, auto_lock_
--    overdue) run as the owner and are unaffected.
create or replace function public.guard_submission_workflow_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.status is distinct from old.status then
      raise exception 'status_change_not_allowed';
    end if;
    if new.submitted_at is distinct from old.submitted_at then
      raise exception 'submitted_at_change_not_allowed';
    end if;
    if new.team_id is distinct from old.team_id then
      raise exception 'team_id_change_not_allowed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_submission_workflow_columns on public.submissions;
create trigger guard_submission_workflow_columns
before update on public.submissions
for each row execute function public.guard_submission_workflow_columns();

-- 3. The blanket grants restored in 00009/00010 gave anon INSERT/UPDATE/DELETE
--    on every table. RLS denies all of it today, so this changes no behaviour;
--    it removes the second half of the pair that made finding 2 reachable.
revoke insert, update, delete on all tables in schema public from anon;
alter default privileges in schema public revoke insert, update, delete on tables from anon;
