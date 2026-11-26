-- Supabase's default ACL for tables created by postgres hands anon and
-- authenticated every privilege; 00025 only took insert/update/delete back
-- from anon. TRUNCATE ignores RLS, and REFERENCES, TRIGGER and MAINTAIN are
-- owner tools no request needs.
revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;

-- RLS allows a DELETE only where a DELETE policy exists, and the one such
-- policy is team_members_leader_delete. Every other delete in the app goes
-- through a SECURITY DEFINER RPC or the service role.
revoke delete on all tables in schema public from anon, authenticated;
grant delete on public.team_members to authenticated;

-- The public_* views are owned by postgres, so a write through them skips
-- RLS on the base table. public_profiles is auto-updatable: with the
-- insert/update/delete the default ACL gave authenticated, any signed-in
-- user could rewrite or delete another participant's users row.
revoke all on public.public_profiles, public.public_submissions,
  public.public_team_members, public.public_schedule from anon, authenticated;
grant select on public.public_profiles, public.public_submissions,
  public.public_team_members, public.public_schedule to anon, authenticated;

-- New tables stop inheriting the same set. A table that needs DELETE grants
-- it next to the policy that allows it.
alter default privileges in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;
alter default privileges in schema public
  revoke delete on tables from anon, authenticated;
