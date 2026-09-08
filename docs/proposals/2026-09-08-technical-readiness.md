# Technical readiness and infrastructure decisions

Assessed September 8, 2026. The repository describes a Next.js/Vercel application using Supabase. No organization billing console, production environment file or VPS inventory has established the actual subscription, project capacity or available host. **Supabase plan: unverified. VPS: not selected.** Keep account identifiers, private answers and credentials outside this public proposal.

## Dependencies and owners to identify

| Dependency | Information required | What it unlocks |
| --- | --- | --- |
| Supabase organization | Owner, project reference/region, actual Free/Pro/Team/Enterprise subscription, billing administrator | Correct account and plan verification |
| Supabase project | Compute/disk/usage, spending controls, staging project, migration/RLS owner, backups and recovery | Database QA and optional durable AI budget store |
| Vercel | Team/project, actual plan, preview access, separate environment settings, release/rollback owner | Joint branch preview and server deployment |
| DNS/auth/email | Domain/DNS owner, OAuth application owners/redirects, transactional-email configuration | Reliable login and participant communication |
| Measurement | PostHog/GTM/GA4 owners, QA destination, conversion definition, consent policy | Reliable tracking validation |
| OpenRouter | Organization-controlled application key, evaluation/daily/monthly budgets, alert owner, routing/retention requirements | Paid model evaluation and website AI |
| Public knowledge | Approver, official sources, version/update process, expected traffic | Grounded answers and measured capacity |
| Existing CRM | Product/plan, tenant access, API/channel entitlement, operating team | Managed-service integration decision |
| Existing VPS | Provider/region, available CPU/RAM/disk, OS/architecture, Docker/admin access, current workloads, owner | Self-hosting feasibility, if needed |
| New VPS | Scope (gateway or full CRM), cost ceiling, region, payer, concrete quote approval | A funded host decision |
| Operations | DNS/TLS, persistent storage, external backup/restore, monitoring and maintenance owner | Sustainable CRM operation |
| WhatsApp | Number/control, current app/provider, Meta asset owners, migration/coexistence requirements | Business-channel onboarding |
| Messaging | Actual provider allowance, Meta capacity/quality, templates, billing, consent and controlled-test authorization | Verified send readiness |
| First journey | Trigger, eligible audience, stop condition, operator takeover and release owner | Bounded automation scope |

The private workroom includes the corresponding Portuguese questionnaire with fourteen answer fields. Do not ask stakeholders to paste tokens or passwords into their replies; use scoped invitations and server environment configuration.

## How to verify Supabase

Select the correct organization in the Supabase dashboard and inspect its subscription/billing area. Billing is organization-based; compute is configured per project. Confirm both separately. A public project URL or use of the Supabase SDK cannot establish paid status. Paid plans include subscription and potentially variable charges; the plan name alone is not a capacity estimate. [Official billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase), [pricing](https://supabase.com/pricing)

## Hosting decision

1. Keep website inference in the Next.js server using OpenRouter. It does not require a dedicated model server, GPU, CRM or WhatsApp number. Confirm existing hosting limits and a durable budget store before enabling paid calls.
2. If an existing or managed CRM meets requirements, configure that service. Do not assume a hosted SaaS subscription supplies arbitrary SSH/container access.
3. If self-hosting is justified, inspect an existing host first. Distinguish Evolution API gateway needs from the full EvoCRM Community stack, whose development Compose resolves fourteen services. Separate its database and credentials from participant data.
4. With no suitable host, evaluate an isolated pilot starting at **4 vCPU and 16 GB RAM with SSD storage**. This is a provisional engineering estimate, not an official minimum or load-tested capacity. Size disk/retention from actual use and verify container architecture compatibility.
5. A concrete fallback candidate is **Hostinger KVM 4**, advertised with 4 vCPU, 16 GB RAM and 200 GB NVMe on the assessment date. Validate region, actual term/total payable, renewal, backups and operator ownership before recommending purchase. Promotional monthly equivalents are not necessarily monthly billing. No server was ordered or deployed. [Provider specification](https://www.hostinger.com/br/servidor-vps)

The report, source review, copy and fixture preview can proceed while these answers are collected. Actual database checks, paid inference and messaging each retain their specific access and verification dependencies. See the [OpenRouter design](../superpowers/specs/2026-09-08-openrouter-assistant-design.md) and [Evolution assessment](2026-09-08-evolution-feasibility.md).
