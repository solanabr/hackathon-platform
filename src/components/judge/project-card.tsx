import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { RatingForm } from "@/components/judge/rating-form";
import type { RatingRound } from "@/lib/hackathon";

export type JudgeMember = {
  id: string | null;
  name: string;
  isLeader: boolean;
  headline: string | null;
  avatarUrl: string | null;
  email: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  telegramHandle: string | null;
};

export type JudgeProject = {
  submissionId: string;
  teamName: string;
  projectName: string;
  description: string;
  imageUrl: string | null;
  submittedAt: string | null;
  links: Array<{ label: string; href: string }>;
  members: JudgeMember[];
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
  const graded = rating.grade !== null;

  return (
    <Card className="overflow-hidden p-0 transition-colors hover:border-emerald/40">
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
          <span
            className={`inline-flex shrink-0 items-center rounded-lg border px-3 py-1.5 font-mono text-lg font-semibold tabular-nums ${
              graded
                ? "border-yellow-strong/60 bg-yellow/40 text-green-dark"
                : "border-ink/10 text-muted"
            }`}
          >
            {graded ? `Nota ${rating.grade}` : "-"}
          </span>
        </div>

        {project.imageUrl && (
          <Image
            src={project.imageUrl}
            alt=""
            width={640}
            height={320}
            className="mt-5 h-48 w-full rounded-2xl border border-ink/10 object-cover"
          />
        )}

        {project.description && (
          <p className="mt-5 whitespace-pre-line leading-relaxed text-ink">{project.description}</p>
        )}

        {project.members.length > 0 && (
          <div className="mt-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
              Time
            </p>
            <ul className="mt-3 space-y-3">
              {project.members.map((member) => (
                <li key={member.id ?? member.name} className="flex items-start gap-3">
                  <Avatar src={member.avatarUrl} name={member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {member.id ? (
                        <Link
                          href={`/u/${member.id}`}
                          className="text-sm font-semibold text-ink hover:text-emerald hover:underline"
                        >
                          {member.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-ink">{member.name}</span>
                      )}
                      {member.isLeader && <Badge tone="yellow">Líder</Badge>}
                    </div>
                    {member.headline && (
                      <p className="mt-0.5 truncate text-xs text-muted">{member.headline}</p>
                    )}
                    {member.id && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {member.email && (
                          <MemberContactLink href={`mailto:${member.email}`}>
                            {member.email}
                          </MemberContactLink>
                        )}
                        {member.githubUrl && (
                          <MemberContactLink href={member.githubUrl} external>
                            GitHub
                          </MemberContactLink>
                        )}
                        {member.linkedinUrl && (
                          <MemberContactLink href={member.linkedinUrl} external>
                            LinkedIn
                          </MemberContactLink>
                        )}
                        {member.telegramHandle && (
                          <MemberContactLink
                            href={`https://t.me/${member.telegramHandle.replace(/^@/, "")}`}
                            external
                          >
                            {member.telegramHandle}
                          </MemberContactLink>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {project.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-ink/10 px-3.5 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-emerald/50 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-ink/10 p-6 sm:p-7">
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

function MemberContactLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="max-w-full truncate rounded-full border border-emerald/25 px-2.5 py-1 text-[11px] font-semibold text-emerald transition-colors hover:border-emerald/60"
    >
      {children}
    </Link>
  );
}
