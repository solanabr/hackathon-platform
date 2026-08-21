insert into hackathons (
  slug, name, tagline, description,
  status, starts_at, registration_closes_at, submission_deadline_at,
  finalists_announced_at, presential_at, voting_opens_at, voting_closes_at,
  finalists_count, location_name, location_city,
  luma_url, community_url, prize_summary
) values (
  'solana-cursor-passo-fundo-2026',
  'Hackathon Solana & Cursor',
  'Construa soluções reais com IA e blockchain. Não precisa ser expert.',
  'O Hackathon Solana & Cursor reúne estudantes, desenvolvedores, designers e entusiastas para explorar soluções reais com IA e blockchain. Aberto a todos, sem exigir experiência prévia. Fase 1 online de 31 de agosto a 7 de setembro; fase 2 presencial em 12 de setembro no UPF Parque, com Pitch Day, networking e premiação.',
  'published',
  '2026-08-31 09:00-03',
  '2026-09-07 23:59-03',
  '2026-09-09 12:00-03',
  '2026-09-10 12:00-03',
  '2026-09-12 09:00-03',
  '2026-09-12 14:00-03',
  '2026-09-12 17:30-03',
  20,
  'UPF Parque — Parque Científico e Tecnológico',
  'Passo Fundo, RS',
  'https://lu.ma/superteambrasil',
  'https://chat.whatsapp.com/KZcKC67KpTIHgSS3aiKc2i',
  'US$ 3.000 (Solana) · US$ 200 em créditos Cursor para os 3 primeiros · créditos Cursor para todas as equipes · merch kit para o 1º lugar · pré-incubação Apollo para os 4 primeiros'
)
on conflict (slug) do nothing;

insert into hackathon_contents
  (hackathon_id, kind, title, speaker, description, scheduled_at, position, published)
select h.id, v.kind, v.title, v.speaker, v.description, v.scheduled_at, v.position, false
from hackathons h,
(values
  ('aula','Abertura do hackathon','Draau','Regras, banca e critérios de avaliação. Aceleradoras falando sobre dores do mercado. Introdução a Solana e blockchain.','2026-08-31 19:00-03'::timestamptz,1),
  ('aula','Cursor Night','Marcelo · Daniel','Vibecoding com Marcelo e Cursor avançado com Daniel.','2026-09-01 19:00-03'::timestamptz,2),
  ('aula','Tema a definir','Solange',null,'2026-09-02 19:00-03'::timestamptz,3),
  ('aula','Desenvolvimento em Solana','Kauê','Solana na prática e aplicações.','2026-09-03 19:00-03'::timestamptz,4),
  ('aula','Business model + pitch','Aceleradora','Como estruturar o modelo de negócio e montar o pitch.','2026-09-04 19:00-03'::timestamptz,5),
  ('mentoria','Mentorias 1:1',null,'Suporte direto pelos grupos de WhatsApp ao longo do sábado. Horários e mentores a confirmar.','2026-09-05 10:00-03'::timestamptz,6)
) as v(kind,title,speaker,description,scheduled_at,position)
where h.slug = 'solana-cursor-passo-fundo-2026'
  and not exists (
    select 1 from hackathon_contents c where c.hackathon_id = h.id
  );
