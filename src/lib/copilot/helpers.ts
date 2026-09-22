import type { ApiArchiveDoc, ApiProject, ClusterInfo, ProjectCard, Reading, SearchInput } from "./types";

const sorted = (xs?: string[]) => (xs ? [...xs].sort() : undefined);

export function cacheKeyFor(input: SearchInput): string {
  return JSON.stringify({
    q: input.query?.trim().toLowerCase().replace(/\s+/g, " ") || "",
    h: sorted(input.hackathons), t: sorted(input.trackKeys), c: sorted(input.clusterKeys),
    w: input.winnersOnly ?? false, l: input.limit ?? 10, o: input.offset ?? 0,
  });
}

export function normalizeIdea(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const idea = raw.trim().replace(/\s+/g, " ");
  return idea.length >= 8 && idea.length <= 300 ? idea : null;
}

export function mapProject(p: ApiProject): ProjectCard {
  return {
    slug: p.slug, name: p.name, oneLiner: p.oneLiner,
    hackathon: { name: p.hackathon.name, slug: p.hackathon.slug, year: Number(p.hackathon.startDate.slice(0, 4)) },
    tracks: p.tracks.map((t) => t.name),
    isWinner: p.prize != null, inAccelerator: p.accelerator != null,
    evidence: p.evidence.slice(0, 2),
    links: { github: p.links.github, demo: p.links.demo ?? p.links.technicalDemo, colosseum: p.links.colosseum },
    cluster: p.cluster, crowdedness: p.crowdedness, similarity: p.similarity,
  };
}

export function mapReading(d: ApiArchiveDoc): Reading {
  return { id: d.documentId, title: d.title, author: d.author, source: d.source, url: d.url, publishedAt: d.publishedAt, snippet: d.snippet };
}

export function crowdednessLine(cluster: ClusterInfo | null): string | null {
  if (!cluster) return null;
  const built = cluster.projectCount === 1 ? "1 projeto já construiu" : `${cluster.projectCount} projetos já construíram`;
  const won =
    cluster.winnerCount === 0 ? "nenhum venceu prêmio" : cluster.winnerCount === 1 ? "1 venceu prêmio" : `${cluster.winnerCount} venceram prêmios`;
  return `${built} nessa área (${cluster.label}) e ${won}.`;
}

export function agentPrompt(idea: string): string {
  return `Quero construir ${idea}. Alguém já fez isso nos hackathons do Colosseum? Como está o cenário competitivo, o que os projetos anteriores erraram e onde ainda há espaço? Termine com uma avaliação honesta: vale a pena seguir com essa ideia ou não?`;
}
