-- Vibeathon Superteam x Replit: registered here, submitted on Superteam Earn
-- (first edition on submission_mode = 'external'). Seeded as draft; the
-- organizer publishes from /admin once the copy and prizes are confirmed.
insert into public.hackathons (
  slug, name, tagline, description, status,
  starts_at, registration_closes_at, submission_deadline_at, ends_at,
  submission_mode, external_submission_url, community_url, prize_summary, page_md
)
select
  'vibeathon-superteam-replit',
  'Vibeathon Superteam x Replit',
  'Cinco dias pra vibe-codar um MVP na Replit, pitchar e postar. 100% online.',
  'Hackathon online da Superteam Brasil com a Replit: de 8 a 12 de setembro, monte um MVP vibe-codado na Replit, um pitch deck e um post nas redes. US$ 3.000 em prêmios e créditos Replit pro top 5. Inscrição aqui, submissão no Superteam Earn.',
  'draft',
  '2026-09-08T19:00:00-03:00',
  '2026-09-12T23:59:00-03:00',
  '2026-09-12T23:59:00-03:00',
  '2026-09-12T23:59:00-03:00',
  'external',
  'https://superteam.fun/earn/s/superteambr',
  'https://chat.whatsapp.com/BVXYPlcB9R853QnvgzpCRT?mode=gi_t',
  'US$ 3.000 + créditos Replit',
  $md$
## Como funciona

Cinco dias, 100% online. Você se inscreve aqui, constrói o projeto na Replit durante a semana e envia tudo pelo Superteam Earn até sábado à noite. Não precisa de time fechado nem de experiência com blockchain: a ideia é vibe-codar um MVP que funcione e contar a história dele.

| Etapa | Quando | O que acontece |
| --- | --- | --- |
| Abertura | Terça, 08/09, 19h | Live no YouTube e no X: regras, prêmios e o que a Replit espera de um MVP. |
| Workshop de pitch deck | Quarta, 09/09, 19h (a confirmar) | Estevão Rizzo mostra como montar um deck que convence em 3 minutos. |
| Workshop de Replit | Quinta, 10/09, 19h (a confirmar) | Marcelo Echeverria constrói um MVP ao vivo na Replit, do prompt ao deploy. |
| Construção | 08 a 12/09 | Você constrói, posta e prepara o pitch. Suporte no WhatsApp da comunidade. |
| Submissão | Sábado, 12/09, até 23h59 | Envio do projeto no Superteam Earn. Depois disso não entra mais nada. |
| Resultado | A confirmar | Anúncio dos vencedores na comunidade e nas redes. |

## Entregáveis

Os três são obrigatórios. Sem um deles, a submissão não é avaliada.

1. **Pitch deck**: o problema, a solução, o que já funciona e o que vem depois. Curto, direto, em PDF ou link público.
2. **MVP vibe-codado na Replit**: o app rodando, com o link público do projeto na Replit. Pode ser web, bot, API, o que fizer sentido pro problema.
3. **Post em rede social** (X, TikTok ou Instagram) contando que você está participando do Vibeathon. Marque a Superteam Brasil e a Replit e guarde o link.

## Prêmios

**US$ 3.000 em prêmios** pagos pela Superteam Brasil via Superteam Earn, mais **créditos Replit para o top 5**.

| Colocação | Prêmio |
| --- | --- |
| 1º ao 3º | Divisão dos US$ 3.000 (ordem a confirmar) + créditos Replit |
| 4º e 5º | Créditos Replit |

Os créditos caem na conta Replit informada na submissão, então use o mesmo e-mail da sua conta na Replit.

## Regras

- Equipes de qualquer tamanho, sem mínimo nem máximo. Dá pra participar sozinho.
- **Um projeto por pessoa ou equipe.** Quem está em um time não submete outro projeto.
- O MVP precisa ter sido construído durante a semana do Vibeathon, na Replit.
- Todo mundo do time precisa estar inscrito aqui na plataforma.
- A organização pode desclassificar projetos que não cumpram os entregáveis ou o código de conduta da comunidade.

## Como enviar

1. Faça sua inscrição aqui na plataforma (o botão no topo da página).
2. Crie sua conta no Superteam Earn com o mesmo e-mail, se ainda não tiver. Leva dois minutos e é por lá que o prêmio é pago.
3. Até sábado às 23h59, envie o projeto no listing do Vibeathon no Earn: link da Replit, pitch deck e link do post.

Ganhou? O [guia Do Earn ao Pix](/guias/do-earn-ao-pix) mostra como receber a grant em reais.
$md$
where not exists (
  select 1 from public.hackathons where slug = 'vibeathon-superteam-replit'
);
