"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DATE_TIME_NUMERIC } from "@/lib/dates";
import { TRACK_LABEL } from "@/lib/mentorship";
import {
  createMentors,
  updateMentor,
  setMentorAvailable,
  deleteMentor,
  releaseBooking,
  setMentorshipEnabled,
  type MentorInput,
} from "@/app/(app)/admin/h/[slug]/mentorship/actions";
import type { MentorTrack } from "@/types/db";

export type AdminMentor = {
  id: string;
  track: MentorTrack;
  name: string;
  specialty: string | null;
  booking_url: string;
  available: boolean;
  claimCount: number;
};

export type AdminBooking = {
  id: string;
  track: MentorTrack;
  teamName: string;
  mentorName: string;
  claimedByName: string | null;
  claimedAt: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

const FIELD =
  "mt-1 w-full rounded-xl border border-green-dark/15 bg-surface px-3 py-2 text-sm";
const LABEL = "font-mono text-[11px] font-semibold uppercase tracking-widest text-muted";

function useRunner() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onDone?.();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return { error, setError, pending, run };
}

function MentorRow({ slug, mentor }: { slug: string; mentor: AdminMentor }) {
  const { error, pending, run } = useRunner();
  const [draft, setDraft] = useState<MentorInput>({
    name: mentor.name,
    specialty: mentor.specialty ?? "",
    bookingUrl: mentor.booking_url,
  });

  const dirty =
    draft.name !== mentor.name ||
    draft.specialty !== (mentor.specialty ?? "") ||
    draft.bookingUrl !== mentor.booking_url;

  return (
    <li className="rounded-xl border-2 border-green-dark/15 bg-surface-deep p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Nome</span>
          <input
            className={FIELD}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Especialidade</span>
          <input
            className={FIELD}
            value={draft.specialty}
            onChange={(e) => setDraft({ ...draft, specialty: e.target.value })}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className={LABEL}>Link de agendamento</span>
        <input
          className={FIELD}
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={draft.bookingUrl}
          onChange={(e) => setDraft({ ...draft, bookingUrl: e.target.value })}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] text-muted tabular-nums">
          {mentor.claimCount} {mentor.claimCount === 1 ? "time escolheu" : "times escolheram"}
        </span>

        <Button
          type="button"
          variant={mentor.available ? "secondary" : "primary"}
          className="px-4 py-2 text-sm"
          disabled={pending}
          onClick={() =>
            run(() => setMentorAvailable({ slug, mentorId: mentor.id, available: !mentor.available }))
          }
        >
          {mentor.available ? "Marcar sem horários" : "Reabrir"}
        </Button>

        {dirty && (
          <>
            <Button
              type="button"
              variant="primary"
              className="px-4 py-2 text-sm"
              disabled={pending}
              onClick={() => run(() => updateMentor({ slug, mentorId: mentor.id, mentor: draft }))}
            >
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-4 py-2 text-sm"
              disabled={pending}
              onClick={() =>
                setDraft({
                  name: mentor.name,
                  specialty: mentor.specialty ?? "",
                  bookingUrl: mentor.booking_url,
                })
              }
            >
              Desfazer
            </Button>
          </>
        )}

        <ConfirmButton
          label="Remover"
          prompt="Remover este mentor?"
          variant="danger"
          disabled={pending}
          className="px-4 py-2 text-sm"
          onConfirm={() => run(() => deleteMentor({ slug, mentorId: mentor.id }))}
        />
      </div>

      {!mentor.available && (
        <p className="mt-2 text-sm text-muted">
          Sem horários — não aparece para quem ainda não escolheu.
        </p>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </li>
  );
}

/**
 * One mentor per line, `Nome | Especialidade | https://...`. The organizer
 * already has this list in a message or a sheet; typing six of them into
 * separate fields on a phone the night before is the slow path.
 */
export function MentorshipEnabledToggle({
  slug,
  enabled,
  usesTeams,
}: {
  slug: string;
  enabled: boolean;
  usesTeams: boolean;
}) {
  const { error, pending, run } = useRunner();

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="font-heading text-lg font-bold">
          {enabled ? "Mentoria ativa" : "Mentoria desativada nesta edição"}
        </h2>
        <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
          {enabled
            ? "Os líderes escolhem mentores pelo painel. Desligue para esconder o card e fechar a escolha."
            : "Nenhum participante vê mentores enquanto estiver desligada. Ligue quando a lista estiver pronta."}
        </p>
        {!usesTeams && (
          <p className="mt-2 text-sm font-semibold text-red-700">
            Esta edição não usa times na plataforma, então a mentoria não aparece para ninguém
            mesmo ligada.
          </p>
        )}
        {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
      </div>
      <Button
        type="button"
        variant={enabled ? "secondary" : "primary"}
        disabled={pending}
        onClick={() => run(() => setMentorshipEnabled({ slug, enabled: !enabled }))}
      >
        {enabled ? "Desligar mentoria" : "Ligar mentoria"}
      </Button>
    </div>
  );
}

export function parseMentorLines(text: string): MentorInput[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", specialty = "", bookingUrl = ""] = line.split("|").map((p) => p.trim());
      return { name, specialty, bookingUrl };
    });
}

export function MentorTrackPanel({
  slug,
  track,
  mentors,
}: {
  slug: string;
  track: MentorTrack;
  mentors: AdminMentor[];
}) {
  const { error, pending, run } = useRunner();
  const [bulk, setBulk] = useState("");

  const parsed = parseMentorLines(bulk);

  return (
    <div>
      <h2 className="font-heading text-xl font-bold">{TRACK_LABEL[track]}</h2>

      {mentors.length === 0 ? (
        <p className="mt-4 font-mono text-sm text-muted">Nenhum mentor ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {mentors.map((mentor) => (
            <MentorRow key={mentor.id} slug={slug} mentor={mentor} />
          ))}
        </ul>
      )}

      <div className="mt-6 border-t-2 border-green-dark/10 pt-5">
        <span className={LABEL}>Adicionar (um por linha)</span>
        <textarea
          className={`${FIELD} font-mono`}
          rows={3}
          placeholder={"Ana Souza | Solana e Anchor | https://cal.com/ana"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="primary"
            className="px-5 py-2 text-sm"
            disabled={pending || parsed.length === 0}
            onClick={() =>
              run(() => createMentors({ slug, track, mentors: parsed }), () => setBulk(""))
            }
          >
            Adicionar {parsed.length > 1 ? `${parsed.length} mentores` : "mentor"}
          </Button>
          <span className="font-mono text-[11px] text-muted">Nome | Especialidade | link</span>
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </div>
  );
}

export function BookingsLedger({ slug, bookings }: { slug: string; bookings: AdminBooking[] }) {
  const { error, pending, run } = useRunner();

  return (
    <div>
      <h2 className="font-heading text-xl font-bold">Agendamentos</h2>
      <p className="mt-1 text-sm text-muted">
        Liberar devolve a mentoria para o time escolher outro mentor.
      </p>

      {bookings.length === 0 ? (
        <p className="mt-4 font-mono text-sm text-muted">Nenhum time escolheu mentor ainda.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-green-dark/15 bg-surface-deep px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-bold">{booking.mentorName}</p>
                <p className="text-sm text-muted">
                  {booking.teamName} · {TRACK_LABEL[booking.track]}
                  {booking.claimedByName ? ` · ${booking.claimedByName}` : ""} ·{" "}
                  <span className="font-mono tabular-nums">
                    {DATE_TIME_NUMERIC.format(new Date(booking.claimedAt))}
                  </span>
                </p>
              </div>
              <ConfirmButton
                label="Liberar"
                prompt="Liberar esta mentoria?"
                variant="danger"
                disabled={pending}
                className="px-4 py-2 text-sm"
                onConfirm={() => run(() => releaseBooking({ slug, bookingId: booking.id }))}
              />
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
