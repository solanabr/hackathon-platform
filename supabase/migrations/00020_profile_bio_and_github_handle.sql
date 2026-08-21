alter table public.users
  add column if not exists headline text,
  add column if not exists bio text;

-- GitHub OAuth already hands us the avatar and the login; the trigger was
-- keeping only the avatar, so every profile started with an empty GitHub link
-- even though the account was created with GitHub.
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
    select id from public.team_members
    where user_id = new.id and status = 'pending'
    order by invited_at asc
    limit 1
  );

  return new;
end;
$$;

update public.users u
set github_url = 'https://github.com/' || (au.raw_user_meta_data->>'user_name')
from auth.users au
where au.id = u.id
  and u.github_url is null
  and nullif(au.raw_user_meta_data->>'user_name', '') is not null;
