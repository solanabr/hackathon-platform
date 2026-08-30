"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { segmentedContainer, segmentClass } from "@/components/ui/segmented";
import {
  roleLabel,
  telegramUrl,
  type TeamUpBoard as TeamUpBoardData,
  type BoardTeam,
  type BoardSeeker,
} from "@/lib/team-up";
import { SeekerForm } from "./seeker-form";
import { applyToTeam, withdrawApplication, inviteSeeker } from "./actions";

const APPLY_MESSAGE_MAX = 500;

type Viewer = {
  userId: string;
  isLeader: boolean;
  teamId: string | null;
  hasTeam: boolean;
  profileComplete: boolean;
};

type Application = { id: string; team_id: string; status: string };

export function TeamUpBoard({
  slug,
  hackathonId,
  board,
  viewer,
  seekerPost,
  applications,
}: {
  slug: string;
  hackathonId: string;
  board: TeamUpBoardData;
  viewer: Viewer;
  seekerPost: { roles: string[]; note: string | null; active: boolean } | null;
  applications: Application[];
}) {
  const [tab, setTab] = useState<"teams" | "seekers">("teams");

  const applicationByTeam = new Map(
    applications.filter((a) => a.status === "pending").map((a) => [a.team_id, a]),
  );

  const topStrip = viewer.hasTeam ? (
    viewer.isLeader ? (
      <Card sticker className="p-6">
        <p className="font-heading text-lg font-bold">Gerencie o recrutamento do seu time</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Abra vagas, veja candidaturas e convide participantes disponíveis pelo painel do time.
        </p>
        <Link href={`/h/${slug}/team`} className="btn-primary mt-4 inline-block px-5 py-2 text-sm">
          Gerenciar recrutamento e candidaturas
        </Link>
      </Card>
    ) : null
  ) : (
    <SeekerForm hackathonId={hackathonId} profileComplete={viewer.profileComplete} initial={seekerPost} />
  );

  return (
    <div className="space-y-6">
      {topStrip}

      <div className={`${segmentedContainer} lg:hidden`}>
        <button type="button" className={segmentClass(tab === "teams")} onClick={() => setTab("teams")}>
          Times recrutando
        </button>
        <button
          type="button"
          className={segmentClass(tab === "seekers")}
          onClick={() => setTab("seekers")}
        >
          Quem está disponível
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={tab === "teams" ? "space-y-4" : "hidden lg:block lg:space-y-4"}>
          <h2 className="font-heading text-xl font-bold">Times recrutando</h2>
          {board.teams.length === 0 ? (
            <EmptyState title="Nenhum time recrutando ainda." />
          ) : (
            <div className="space-y-4">
              {board.teams.map((team) => (
                <TeamCard
                  key={team.team_id}
                  team={team}
                  viewer={viewer}
                  application={applicationByTeam.get(team.team_id) ?? null}
                />
              ))}
            </div>
          )}
        </section>

        <section className={tab === "seekers" ? "space-y-4" : "hidden lg:block lg:space-y-4"}>
          <h2 className="font-heading text-xl font-bold">Quem está disponível</h2>
          {board.seekers.length === 0 ? (
            <EmptyState title="Ninguém disponível ainda." />
          ) : (
            <div className="space-y-4">
              {board.seekers.map((seeker) => (
                <SeekerCard key={seeker.user_id} seeker={seeker} viewer={viewer} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TeamCard({
  team,
  viewer,
  application,
}: {
  team: BoardTeam;
  viewer: Viewer;
  application: Application | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isOwnTeam = viewer.teamId === team.team_id;

  function submitApplication() {
    setError(null);
    startTransition(async () => {
      const res = await applyToTeam({ teamId: team.team_id, message });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setExpanded(false);
      setMessage("");
      router.refresh();
    });
  }

  function withdraw() {
    if (!application) return;
    setError(null);
    startTransition(async () => {
      const res = await withdrawApplication({ applicationId: application.id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card sticker className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold">{team.name}</p>
          {team.description && <p className="mt-1 text-sm text-muted">{team.description}</p>}
        </div>
        <p className="shrink-0 font-mono text-xs tabular-nums text-muted">{team.accepted_count}/4</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {team.roles.map((r) => (
          <Badge key={r} tone="emerald">
            {roleLabel(r)}
          </Badge>
        ))}
      </div>

      {team.note && <p className="mt-3 text-sm leading-relaxed text-ink">{team.note}</p>}

      <div className="mt-4 flex items-center gap-2.5">
        <Avatar src={team.leader_avatar_url} name={team.leader_name} size="sm" />
        <span className="text-sm text-muted">
          Líder: <span className="text-ink">{team.leader_name ?? "—"}</span>
        </span>
      </div>

      {!isOwnTeam && (
        <div className="mt-4">
          {application && application.status === "pending" ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="yellow">Candidatura enviada</Badge>
              <ConfirmButton
                label="Cancelar candidatura"
                variant="secondary"
                disabled={pending}
                onConfirm={withdraw}
              />
            </div>
          ) : !viewer.hasTeam ? (
            expanded ? (
              <div className="space-y-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, APPLY_MESSAGE_MAX))}
                  maxLength={APPLY_MESSAGE_MAX}
                  rows={3}
                  placeholder="Conte rapidamente por que você quer entrar nesse time"
                  className="w-full rounded-xl border border-green-dark/20 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-green-dark"
                />
                <p className="text-right text-xs text-muted">
                  {message.length}/{APPLY_MESSAGE_MAX}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="primary" disabled={pending} onClick={submitApplication}>
                    {pending ? "Enviando..." : "Enviar candidatura"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="primary" onClick={() => setExpanded(true)}>
                Candidatar-se
              </Button>
            )
          ) : null}
        </div>
      )}

      {error && <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>}
    </Card>
  );
}

function SeekerCard({ seeker, viewer }: { seeker: BoardSeeker; viewer: Viewer }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite() {
    if (!viewer.teamId) return;
    setError(null);
    startTransition(async () => {
      const res = await inviteSeeker({ teamId: viewer.teamId as string, userId: seeker.user_id });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card sticker className="p-6">
      <div className="flex items-start gap-3">
        <Avatar src={seeker.avatar_url} name={seeker.full_name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-bold">{seeker.full_name ?? "Participante"}</p>
          {seeker.headline && <p className="text-sm text-muted">{seeker.headline}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {seeker.roles.map((r) => (
          <Badge key={r} tone="emerald">
            {roleLabel(r)}
          </Badge>
        ))}
      </div>

      {seeker.note && <p className="mt-3 text-sm leading-relaxed text-ink">{seeker.note}</p>}

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {seeker.telegram_handle && (
          <a
            href={telegramUrl(seeker.telegram_handle)}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald hover:underline"
          >
            Telegram
          </a>
        )}
        {seeker.github_url && (
          <a
            href={seeker.github_url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald hover:underline"
          >
            GitHub
          </a>
        )}
        {seeker.twitter_url && (
          <a
            href={seeker.twitter_url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald hover:underline"
          >
            Twitter
          </a>
        )}
        {seeker.linkedin_url && (
          <a
            href={seeker.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-emerald hover:underline"
          >
            LinkedIn
          </a>
        )}
      </div>

      {viewer.isLeader && (
        <div className="mt-4">
          <ConfirmButton label="Convidar" variant="primary" disabled={pending} onConfirm={invite} />
        </div>
      )}

      {error && <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>}
    </Card>
  );
}
