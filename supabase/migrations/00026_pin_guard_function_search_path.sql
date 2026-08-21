-- Advisor 0011: the guard added in 00025 had a role-mutable search_path.
create or replace function public.guard_submission_workflow_columns()
returns trigger
language plpgsql
set search_path = ''
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
