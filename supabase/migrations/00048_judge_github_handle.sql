-- The GitHub user teams add as collaborator on private repos was hardcoded
-- ("@kauenet") in the submission form; it becomes per-edition configuration,
-- set by the organizer in the edition form. No seed — until it is set, the
-- form shows generic copy instead of a wrong handle.

alter table public.hackathons add column if not exists judge_github_handle text;
