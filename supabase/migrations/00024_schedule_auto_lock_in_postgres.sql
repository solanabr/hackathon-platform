-- The deadline is already enforced by submit_team and by the submissions update
-- policy, so this job only materialises state: drafts become submitted so an
-- unfinished team is still judged, and teams get locked. Running it in Postgres
-- removes a public endpoint, a shared secret and a Vercel plan dependency, and
-- lets it tick every minute instead of every fifteen.

create extension if not exists pg_cron;

select cron.unschedule(jobid)
from cron.job
where jobname = 'lock-overdue-submissions';

select cron.schedule(
  'lock-overdue-submissions',
  '* * * * *',
  $$select public.auto_lock_overdue()$$
);
