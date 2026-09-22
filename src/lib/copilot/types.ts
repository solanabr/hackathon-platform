export type ApiProject = {
  slug: string; name: string; oneLiner: string; similarity: number;
  hackathon: { name: string; slug: string; startDate: string };
  tracks: { name: string; key: string }[];
  links: { github: string | null; demo: string | null; presentation: string | null; technicalDemo: string | null; twitter: string | null; colosseum: string | null };
  evidence: string[];
  prize: unknown | null; accelerator: unknown | null;
  metrics: { updatesCount: number }; team: { count: number };
  tags: { problemTags: string[]; solutionTags: string[]; primitives: string[]; techStack: string[]; targetUsers: string[] };
  crowdedness: number | null; cluster: { key: string; label: string } | null;
};

export type ApiFilters = {
  hackathons: { slug: string; name: string; startDate: string; projectCount: number; winnerCount: number }[];
  tracks: { key: string; name: string; hackathonSlug: string; projectCount: number }[];
  clusters: { key: string; label: string; projectCount: number }[];
};

export type ApiCluster = { key: string; label: string; projectCount: number; winnerCount: number };

export type ProjectCard = {
  slug: string; name: string; oneLiner: string;
  hackathon: { name: string; slug: string; year: number };
  tracks: string[]; isWinner: boolean; inAccelerator: boolean;
  evidence: string[];
  links: { github: string | null; demo: string | null; colosseum: string | null };
  cluster: { key: string; label: string } | null; crowdedness: number | null; similarity: number;
};

export type ClusterInfo = ApiCluster;

export type SearchInput = {
  query?: string; hackathons?: string[]; trackKeys?: string[]; clusterKeys?: string[];
  winnersOnly?: boolean; limit?: number; offset?: number;
};
