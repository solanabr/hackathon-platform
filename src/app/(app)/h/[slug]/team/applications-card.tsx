"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { telegramUrl } from "@/lib/team-up";
import { respondToApplication } from "../team-up/actions";

export type PendingApplication = {
  id: string;
  message: string | null;
  created_at: string;
  applicant: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    headline: string | null;
    github_url: string | null;
    telegram_handle: string | null;
  };
};

export function ApplicationsCard({ applications }: { applications: PendingApplication[] }) {
  return (
    <Card sticker className="p-7">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
        Candidaturas
      </p>
      <h2 className="mt-1 font-heading text-lg font-semibold">Candidaturas</h2>

      {applications.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nenhuma candidatura pendente ainda.</p>
      ) : (
        <ul className="mt-4 divide-y divide-green-dark/10">
          {applications.map((app) => (
            <ApplicationRow key={app.id} application={app} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ApplicationRow({ application }: { application: PendingApplication }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondToApplication({ applicationId: application.id, accept });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const applicant = application.applicant;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Avatar src={applicant.avatar_url} name={applicant.full_name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-base font-bold">{applicant.full_name ?? "Participante"}</p>
          {applicant.headline && <p className="text-sm text-muted">{applicant.headline}</p>}

          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {applicant.telegram_handle && (
              <a
                href={telegramUrl(applicant.telegram_handle)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald hover:underline"
              >
                Telegram
              </a>
            )}
            {applicant.github_url && (
              <a
                href={applicant.github_url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald hover:underline"
              >
                GitHub
              </a>
            )}
          </div>

          {application.message && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{application.message}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <ConfirmButton
              label="Aceitar"
              variant="primary"
              disabled={pending}
              onConfirm={() => respond(true)}
            />
            <ConfirmButton
              label="Recusar"
              variant="danger"
              disabled={pending}
              onConfirm={() => respond(false)}
            />
          </div>

          {error && <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>}
        </div>
      </div>
    </li>
  );
}
