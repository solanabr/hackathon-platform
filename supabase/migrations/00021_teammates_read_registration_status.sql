-- The dashboard shows each member's registration state so a leader knows who is
-- blocking the submission, but RLS limited hackathon_registrations to the caller's
-- own row, so every teammate rendered as unconfirmed regardless of the truth.
-- shares_active_team_with is the same SECURITY DEFINER helper the users and teams
-- policies already use, so teammates see each other here and nobody else does.

create policy hackathon_registrations_select_teammates on hackathon_registrations
  for select to authenticated
  using (public.shares_active_team_with(user_id));
