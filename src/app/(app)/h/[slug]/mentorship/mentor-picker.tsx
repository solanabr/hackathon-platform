"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DATE_TIME_NUMERIC } from "@/lib/dates";
import { TRACK_LABEL, TRACK_HINT, firstName, type BoardBooking, type TrackGroup } from "@/lib/mentorship";
import { bookMentorship } from "./actions";

export function BookedMentor({ booking }: { booking: BoardBooking }) {
  return (
    <Card sticker className="p-6 sm:p-7">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
        {TRACK_LABEL[booking.track]}
      </p>
      <h2 className="mt-1 font-heading text-xl font-bold">{booking.mentor_name}</h2>
      {booking.mentor_specialty && (
        <p className="mt-1 text-sm text-muted">{booking.mentor_specialty}</p>
      )}

      {booking.booking_url ? (
        <>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Falta marcar o horário. Abra a agenda do {firstName(booking.mentor_name)} e escolha um
            horário — sem isso, a mentoria não acontece.
          </p>
          <a
            href={booking.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-4 inline-block px-5 py-2 text-sm"
          >
            Abrir agenda do {firstName(booking.mentor_name)}
          </a>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          O líder do time já escolheu este mentor.
        </p>
      )}

      <p className="mt-4 font-mono text-[11px] text-muted">
        Escolhido{booking.claimed_by_name ? ` por ${booking.claimed_by_name}` : ""} em{" "}
        <span className="tabular-nums">{DATE_TIME_NUMERIC.format(new Date(booking.claimed_at))}</span>.
        Para trocar de mentor, fale com a organização.
      </p>
    </Card>
  );
}

export function MentorPicker({ groups }: { groups: TrackGroup[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(mentorId: string) {
    setError(null);
    startTransition(async () => {
      const result = await bookMentorship({ mentorId });
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  const booked = groups.filter((g) => g.booking).length;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      {/* The external agenda is outside our reach, so the rule is held by the
          copy: this is the only place a leader is told what abusing it costs. */}
      <div className="rounded-xl border-2 border-green-dark/15 border-l-4 border-l-yellow-strong bg-surface-deep px-4 py-3">
        <p className="text-sm leading-relaxed text-ink">
          <span className="font-bold">
            Permitido apenas uma escolha por categoria (Técnico e Negócios) por time, sendo 1 com
            mentor técnico e 1 com mentor de negócios.
          </span>{" "}
          Repassar o link ou marcar mais de um horário na mesma categoria cancela as mentorias do
          time e pode levar à desclassificação.
        </p>
      </div>

      {groups.map((group) =>
        group.booking ? (
          <BookedMentor key={group.track} booking={group.booking} />
        ) : (
          <Card key={group.track} sticker className="p-6 sm:p-7">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              {TRACK_LABEL[group.track]}
            </p>
            <p className="mt-1 text-sm text-muted">{TRACK_HINT[group.track]}</p>

            {group.mentors.length === 0 ? (
              <p className="mt-5 font-mono text-sm text-muted">
                Nenhum mentor disponível nesta mentoria agora.
              </p>
            ) : (
              <ul className="mt-5 space-y-2">
                {group.mentors.map((mentor) => (
                  <li
                    key={mentor.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-green-dark/15 bg-surface-deep px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-bold">{mentor.name}</p>
                      {mentor.specialty && (
                        <p className="text-sm text-muted">{mentor.specialty}</p>
                      )}
                    </div>
                    <ConfirmButton
                      label={`Escolher ${firstName(mentor.name)}`}
                      prompt="Confirma? Só a organização troca depois."
                      disabled={pending}
                      className="px-4 py-2 text-sm"
                      onConfirm={() => choose(mentor.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ),
      )}

      {booked === 1 && (
        <p className="text-sm text-muted">
          Falta escolher a outra mentoria — são independentes, e dá para ficar só com uma se
          preferir.
        </p>
      )}
    </div>
  );
}
