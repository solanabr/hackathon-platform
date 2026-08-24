import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingForm } from "@/components/judge/rating-form";
import type { RatingRound } from "@/lib/hackathon";

export type JudgeProject = {
  submissionId: string;
  teamName: string;
  projectName: string;
  description: string;
  imageUrl: string | null;
  submittedAt: string | null;
  links: Array<{ label: string; href: string }>;
  members: Array<{ name: string; isLeader: boolean }>;
};

const WHEN = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function JudgeProjectCard({
  project,
  hackathonId,
  slug,
  round,
  rating,
}: {
  project: JudgeProject;
  hackathonId: string;
  slug: string;
  round: RatingRound;
  rating: { grade: number | null; comment: string };
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-bold">{project.projectName}</h2>
            <p className="mt-1 text-sm text-muted">
              Time {project.teamName}
              {project.submittedAt &&
                ` · enviado ${WHEN.format(new Date(project.submittedAt)).replace(/\./g, "")}`}
            </p>
          </div>
          <Badge tone={rating.grade !== null ? "emerald" : "neutral"}>
            {rating.grade !== null ? `Nota ${rating.grade}` : "Sem nota"}
          </Badge>
        </div>

        {project.imageUrl && (
          <Image
            src={project.imageUrl}
            alt=""
            width={640}
            height={320}
            className="mt-5 h-48 w-full rounded-2xl border border-green/15 object-cover"
          />
        )}

        {project.description && (
          <p className="mt-5 whitespace-pre-line leading-relaxed text-ink">{project.description}</p>
        )}

        {project.members.length > 0 && (
          <p className="mt-5 text-sm text-muted">
            {project.members
              .map((m) => (m.isLeader ? `${m.name} (líder)` : m.name))
              .join(" · ")}
          </p>
        )}

        {project.links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {project.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-green/20 px-3 py-1 text-sm font-semibold text-muted transition-colors hover:border-green/50 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-green/10 p-6 sm:p-7">
        <RatingForm
          hackathonId={hackathonId}
          submissionId={project.submissionId}
          slug={slug}
          round={round}
          initialGrade={rating.grade}
          initialComment={rating.comment}
        />
      </div>
    </Card>
  );
}
