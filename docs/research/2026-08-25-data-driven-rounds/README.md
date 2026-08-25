# Data-driven audit — 10 iterative rounds

Goal: map how to make the platform properly data-driven and modular, so future hackathons
compose their own edition pages, dashboards, and content archives instead of inheriting
hardcoded copy and fixed structure.

Method: 20 sequential rounds, ~5 parallel agents per round, each round focused on the
data-driven theme and learning from the previous round's findings to pick the next focus.
Rounds 11-13 are review rounds: they look back at 1-10 and chart the direction for 14-20.

- [ROUND-01.md](ROUND-01.md) — baseline: hardcoded-vs-data map across the whole app
- [ROUND-02.md](ROUND-02.md) — data models for deliverables, sections, archive, prizes, generalization
- [ROUND-03.md](ROUND-03.md) — migration plan 00036-00041, phases, registration config, admin, rendering
- [ROUND-04.md](ROUND-04.md) — create flow, renderers, context builder, archive deep-spec, validation
- [ROUND-05.md](ROUND-05.md) — ground truth, deploy readiness, performance, editor fields, test matrix
- [ROUND-06.md](ROUND-06.md) — home hub, dashboard composition, migration correctness, multi-edition ops, notifications
- ... (rounds 07-20 append as they complete)
- [ULTIMATE-REPORT.md](ULTIMATE-REPORT.md) — the consolidated, prioritized plan

## Event context
Event 31 Aug - 12 Sep 2026. Submissions close 09/09 12:00 BRT. The platform is at
feat/home-lp-hub (Superteam BR LP theme); migrations through 00035 applied per handoff;
00036 (sections + content kinds + thumbnail) is in flight on the same branch.
