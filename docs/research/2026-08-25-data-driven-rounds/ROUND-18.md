# Round 18 — The community layer design

5 agents. Hall-of-fame, engagement, growth, moat, synthesis.

## Hall of fame + trajectories (agent 1)
- **Trajectory** (data-only, one new view): `public_results` (team_id, placement, hackathon_name/slug/dates, submission/project) gated on `is_finalist AND placement NOT NULL AND status <> 'draft'` — placements are written post-Pitch-Day so the reveal-gate is inherent. The profile "Trajetória" = two anon queries (the user's teams → public_results ordered by starts_at).
- **Non-leader fix** (query-only): profiles list projects where the user is ANY accepted member (public_team_members), not just leader — leaders auto-included (they're inserted as accepted members).
- **Hall-of-fame**: `/resultados` (mirrors /projetos), linked from the footer + the home "Encerradas" filter, LP-skin podium band + yellow 1º/2º/3º chips; fully data-driven (a closed edition contributes automatically). Also fixes the unlinked-avatar gap.

## Engagement + retention (agent 2)
- The **bell** (notifications table from M6/00044): count = read_at null, batch-read on open, per-row hrefs; event points: registration, submit (inside the RPC), finalists (per leader + members), content-publish, team-add; T-7/T-1 via pg_cron enqueue.
- **Return moments**: "Sua trajetória" on account (placements, data-only), past-edition "você participou" state, next-edition CTA.
- **Audience voting stays OUT for 2026** (the regulamento: judge-only). A post-event `votes` table + Voting phase is the only future path; likes (Devpost parity) are the only safe add this cycle, gated by metadata.
- The hub: `featured` orders the deck, the ticker built server-side with real deadlines, the hall-of-fame teaser.

## Growth + scale (agent 3)
- **Template system**: `duplicateEdition(source_id, new_slug, date_shift)` RPC — copy hackathons + contents (never teams/submissions/roles); any closed edition is a template.
- **Ops backbone**: edition_health view (one row per edition → 2 round-trips), cross-edition triage flags, the scoped-admin tier.
- **Regional expansion**: a new city edition = template + metadata config — NO code per edition once metadata is wired (today the SUPPORTERS/DELIVERABLES hardcodes break that; metadata is the dead escape hatch).

## Community moat (agent 4)
- The community lives on WhatsApp (community_url = a chat link, rendered only behind login) + Luma (pure self-attestation).
- **WhatsApp-native surfaces**: the paste-ready invite text (honest — the identity-loop instruction IS the message until the accept mechanism lands), the shareable project card (gallery needs generateMetadata + metadataBase + og:image — currently image-less), the Luma honesty (label `luma_confirmed_at` as "declarou inscrição", never host-verified; do NOT invent an "aguardando aprovação" state).
- **Record-keeper value**: Luma owns ticketing, WhatsApp owns chatter, the platform owns the record — the permanent shareable artifact (gallery, finalists, placements).
- Config home: the dead `metadata` jsonb / registration_config.

## Synthesis (agent 5)
- Architecture: mostly post-event; the pre-event slice is the finalist panel + WhatsApp invites + the data-only fixes. M6 (00044/00045) is the community-carrying milestone; the engagement loop (votes/likes) is post-M6.
- Roadmap: (1) finalist panel (pre-event, S, the reveal must not hinge on email), (2) WhatsApp invites + share (pre-event, S), (3) the data-only fixes (near-zero), (4) M6 bell/notifications/featured, (5) hall-of-fame + stats (post-event), (6) trajectory + voting (post-M6).
- Metrics: north-star = finalists learn in-app within an hour (measured via the bell + reveal click; hedges the deliverability); 3-year = cross-edition return rate.
- Scope guard: no funding rails, marketplace, eternal challenge, on-chain voting, AI judging, bounties, cofounder matching — the moat is the stage and memory, not the capital rails.

## Where round 19 focuses
The UX/product vision: the LP design language, the joy moments, the error/empty UX, mobile, the i18n scope line.
