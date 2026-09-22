import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { CopilotNotConfigured, CopilotRateLimited, getCluster, getFilters, searchProjects } from "@/lib/copilot/client";
import { agentPrompt, crowdednessLine } from "@/lib/copilot/helpers";
import { IDEA_DAILY_CAP, claimIdeaSearch, refundIdeaSearch } from "@/lib/copilot/quota";
import { SemaphoreTimeout } from "@/lib/copilot/semaphore";
import { keepKnownKeys, parseSearchRequest } from "./parse";

const CAP_MESSAGE =
  `Você usou as ${IDEA_DAILY_CAP} pesquisas de hoje por aqui. Para continuar sem limite, gere seu próprio token no Colosseum e use o Copilot no seu agente.`;

function failure(e: unknown) {
  if (e instanceof CopilotRateLimited)
    return NextResponse.json({ error: `Muita gente pesquisando agora. Tente em ${e.retryAfterSeconds} segundos.`, code: "rate_limited", retryAfter: e.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(e.retryAfterSeconds) } });
  if (e instanceof SemaphoreTimeout)
    return NextResponse.json({ error: "Muita gente pesquisando agora. Tente em 15 segundos.", code: "rate_limited", retryAfter: 15 }, { status: 429 });
  if (e instanceof CopilotNotConfigured)
    return NextResponse.json({ error: "A busca ainda não está configurada.", code: "unavailable" }, { status: 503 });
  console.error("[copilot.search]", e instanceof Error ? e.message : e);
  return NextResponse.json({ error: "O Copilot está fora do ar. Tente mais tarde.", code: "unavailable" }, { status: 503 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseSearchRequest(body);
  if (!parsed) {
    const mode = body && typeof body === "object" ? (body as Record<string, unknown>).mode : undefined;
    if (mode === "browse") return NextResponse.json({ error: "Filtro inválido.", code: "invalid" }, { status: 400 });
    return NextResponse.json({ error: "Escreva sua ideia em pelo menos 8 caracteres.", code: "invalid" }, { status: 400 });
  }

  const state = parsed.mode === "idea" ? await resolveAuthenticatedUserState().catch(() => null) : null;
  if (parsed.mode === "idea" && !state) {
    return NextResponse.json({ error: "Entre na sua conta para pesquisar uma ideia.", code: "unauthenticated" }, { status: 401 });
  }

  try {
    if (parsed.mode === "browse") {
      const catalog = await getFilters();
      const filtered = keepKnownKeys(parsed, catalog);
      const out = await searchProjects({
        hackathons: filtered.hackathon ? [filtered.hackathon] : undefined,
        trackKeys: filtered.trackKey ? [filtered.trackKey] : undefined,
        clusterKeys: filtered.clusterKey ? [filtered.clusterKey] : undefined,
        winnersOnly: filtered.winnersOnly, limit: 12, offset: filtered.offset,
      });
      return NextResponse.json({ projects: out.results, hasMore: out.hasMore, totalFound: out.totalFound });
    }

    const claim = await claimIdeaSearch(state!.userId);
    if (claim === null) return NextResponse.json({ error: "O Copilot está fora do ar. Tente mais tarde.", code: "unavailable" }, { status: 503 });
    if (claim === "cap") return NextResponse.json({ error: CAP_MESSAGE, code: "quota" }, { status: 429 });

    try {
      const projects = await searchProjects({ query: parsed.idea, limit: 6 });
      const top = projects.results[0];
      const cluster = top?.cluster ? await getCluster(top.cluster.key) : null;

      return NextResponse.json({
        projects: projects.results,
        crowdedness: crowdednessLine(cluster),
        prompt: agentPrompt(parsed.idea),
        remaining: claim.remaining,
      });
    } catch (e) {
      await refundIdeaSearch(claim.id);
      return failure(e);
    }
  } catch (e) {
    return failure(e);
  }
}
