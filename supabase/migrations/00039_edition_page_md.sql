-- The page body becomes one markdown document per edition: prose is
-- markdown, live data renders through fenced blocks (```phases```,
-- ```schedule```, ```deliverables```, ```prizes```, ```finalists```,
-- ```partners```). This converts each edition's visible section rows into
-- that document, in order, so nothing changes visually. hackathon_sections
-- is NOT dropped here — destruction waits for a later migration, after the
-- rendered page is verified against the converted document.

alter table public.hackathons add column if not exists page_md text;

update public.hackathons h
set page_md = doc.body || E'\n\n```finalists```\n\n```partners```\n'
from (
  select
    s.hackathon_id,
    string_agg(
      case s.kind
        when 'markdown' then
          coalesce('## ' || s.title || E'\n\n', '') ||
          coalesce(s.subtitle || E'\n\n', '') ||
          coalesce(s.body_md, '')
        when 'phases' then
          '## ' || coalesce(s.title, 'Como o hackathon acontece') || E'\n\n' ||
          coalesce(s.subtitle || E'\n\n', '') ||
          case when s.config ? 'items' and jsonb_array_length(s.config->'items') > 0
            then E'```phases\n' || jsonb_pretty(s.config->'items') || E'\n```'
            else '```phases```'
          end
        when 'schedule' then
          '## ' || coalesce(s.title, 'Programação') || E'\n\n' ||
          coalesce(s.subtitle || E'\n\n', '') ||
          '```schedule```'
        when 'deliverables' then
          '## ' || coalesce(s.title, 'O que seu time entrega') || E'\n\n' ||
          coalesce(
            s.subtitle,
            'Até ' || extract(day from hk.deadline_local)::int || ' de ' ||
            (array['janeiro','fevereiro','março','abril','maio','junho','julho',
                   'agosto','setembro','outubro','novembro','dezembro'])
              [extract(month from hk.deadline_local)::int] ||
            ' às ' || to_char(hk.deadline_local, 'HH24:MI') || '.'
          ) || E'\n\n' ||
          case when s.config ? 'items'
            then E'```deliverables\n' || jsonb_pretty(s.config->'items') || E'\n```'
            else '```deliverables```'
          end
        when 'prizes' then
          '## ' || coalesce(s.title, 'Premiação') || E'\n\n```prizes```'
      end,
      E'\n\n' order by s.position
    ) as body
  from public.hackathon_sections s
  join lateral (
    select h2.submission_deadline_at at time zone 'America/Sao_Paulo' as deadline_local
    from public.hackathons h2
    where h2.id = s.hackathon_id
  ) hk on true
  where s.deleted_at is null and s.visible
  group by s.hackathon_id
) doc
where doc.hackathon_id = h.id
  and h.page_md is null;
