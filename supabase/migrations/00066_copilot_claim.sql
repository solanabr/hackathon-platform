-- The cap on idea searches must hold under concurrency: one user firing
-- twenty requests at once would otherwise pass the same pre-insert count
-- and burn the shared upstream budget for everyone. The claim takes a
-- per-user advisory lock for the duration of the transaction, so count
-- and insert are one step.
create or replace function public.claim_copilot_idea_search(p_user_id uuid, p_cap int)
returns table (id uuid, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('copilot_idea:' || p_user_id::text));
  select count(*) into v_used
    from public.copilot_queries q
   where q.user_id = p_user_id
     and q.kind = 'idea'
     and q.created_at >= now() - interval '24 hours';
  if v_used >= p_cap then
    return query select null::uuid, 0;
    return;
  end if;
  insert into public.copilot_queries (user_id, kind) values (p_user_id, 'idea')
    returning copilot_queries.id into v_id;
  return query select v_id, p_cap - v_used - 1;
end;
$$;

revoke all on function public.claim_copilot_idea_search(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_copilot_idea_search(uuid, int) to service_role;
