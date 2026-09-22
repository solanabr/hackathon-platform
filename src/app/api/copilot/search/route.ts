import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { CopilotNotConfigured, CopilotRateLimited, getCluster, searchArchives, searchProjects } from "@/lib/copilot/client";
import { agentPrompt, crowdednessLine } from "@/lib/copilot/helpers";
import { IDEA_DAILY_CAP, ideaSearchesLast24h, recordIdeaSearch } from "@/lib/copilot/quota";
import { SemaphoreTimeout } from "@/lib/copilot/semaphore";
import { parseSearchRequest } from "./parse";

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
  const parsed = parseSearchRequest(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Escreva sua ideia em pelo menos 8 caracteres.", code: "invalid" }, { status: 400 });

  try {
    if (parsed.mode === "browse") {
      const out = await searchProjects({
        hackathons: parsed.hackathon ? [parsed.hackathon] : undefined,
        trackKeys: parsed.trackKey ? [parsed.trackKey] : undefined,
        clusterKeys: parsed.clusterKey ? [parsed.clusterKey] : undefined,
        winnersOnly: parsed.winnersOnly, limit: 12, offset: parsed.offset,
      });
      return NextResponse.json({ projects: out.results, hasMore: out.hasMore, totalFound: out.totalFound });
    }

    const state = await resolveAuthenticatedUserState();
    if (!state) return NextResponse.json({ error: "Entre na sua conta para pesquisar uma ideia.", code: "unauthenticated" }, { status: 401 });

    const used = await ideaSearchesLast24h(state.userId);
    if (used >= IDEA_DAILY_CAP) return NextResponse.json({ error: CAP_MESSAGE, code: "quota" }, { status: 429 });

    const [projects, readings] = await Promise.all([
      searchProjects({ query: parsed.idea, limit: 6 }),
      searchArchives(parsed.idea, 3),
    ]);
    const top = projects.results[0];
    const cluster = top?.cluster ? await getCluster(top.cluster.key) : null;
    await recordIdeaSearch(state.userId);

    return NextResponse.json({
      projects: projects.results,
      crowdedness: crowdednessLine(cluster),
      readings,
      prompt: agentPrompt(parsed.idea),
      remaining: Math.max(IDEA_DAILY_CAP - used - 1, 0),
    });
  } catch (e) {
    return failure(e);
  }
}
