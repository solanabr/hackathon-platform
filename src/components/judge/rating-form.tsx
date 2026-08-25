"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { upsertRating, deleteRating } from "@/app/(app)/judge/actions";
import type { RatingRound } from "@/lib/hackathon";

const AUTOSAVE_DELAY = 800;

export function RatingForm({
  hackathonId,
  submissionId,
  slug,
  round,
  initialGrade,
  initialComment,
}: {
  hackathonId: string;
  submissionId: string;
  slug: string;
  round: RatingRound;
  initialGrade: number | null;
  initialComment: string;
}) {
  const router = useRouter();
  const [grade, setGrade] = useState<number | null>(initialGrade);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const rated = initialGrade !== null || initialComment.length > 0;
  const dirty = grade !== initialGrade || comment !== initialComment;

  // Debounced autosave for any edit, grade or comment. latestRef holds the
  // values the timer will flush, so a slider move right before the timer
  // fires is captured too. Manual save cancels the timer so the two never
  // race.
  //
  // Every write runs through runExclusive, which serializes the in-flight
  // request: an autosave that is still pending can't resurrect a rating after
  // "Limpar", nor overwrite a newer manual save, because the manual action is
  // chained after it and lands last.
  const latestRef = useRef({ grade: initialGrade, comment: initialComment });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Serialize writes. Each task runs only after the previous one settles, so
  // an autosave started before a manual save can never resolve afterwards.
  function runExclusive(task: () => Promise<void>): Promise<void> {
    const next = inFlightRef.current.then(task);
    inFlightRef.current = next.catch(() => undefined);
    return next;
  }

  function scheduleAutosave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const { grade: g, comment: c } = latestRef.current;
      // An empty grade with no comment has nothing to persist.
      if (g === null && c === "") return;
      setError(null);
      setSaved(false);
      runExclusive(async () => {
        const res = await upsertRating({ hackathonId, submissionId, slug, round, grade: g, comment: c });
        if (!res.ok) return setError(res.error);
        setSaved(true);
        router.refresh();
      });
    }, AUTOSAVE_DELAY);
  }

  function save() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setError(null);
    setSaved(false);
    start(async () => {
      await runExclusive(async () => {
        const res = await upsertRating({ hackathonId, submissionId, slug, round, grade, comment });
        if (!res.ok) return setError(res.error);
        setSaved(true);
        router.refresh();
      });
    });
  }

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    latestRef.current = { grade: null, comment: "" };
    setError(null);
    setSaved(false);
    start(async () => {
      await runExclusive(async () => {
        const res = await deleteRating({ hackathonId, submissionId, slug, round });
        if (!res.ok) return setError(res.error);
        setGrade(null);
        setComment("");
        setSaved(true);
        router.refresh();
      });
    });
  }

  return (
    <div className="rounded-2xl border border-green/15 bg-surface-raised p-5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={`grade-${submissionId}`}
          className="text-[11px] font-bold uppercase tracking-wider text-muted"
        >
          Sua nota
        </label>
        <span className="font-heading text-2xl font-bold text-ink">
          {grade ?? "—"}
          <span className="ml-1 text-xs font-normal text-muted">/ 10</span>
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Critérios do regulamento: execução técnica, inovação, impacto e relevância, apresentação.
      </p>

      <input
        id={`grade-${submissionId}`}
        type="range"
        min={0}
        max={10}
        step={1}
        value={grade ?? 0}
        onChange={(e) => {
          const value = Number(e.target.value);
          setGrade(value);
          latestRef.current = { grade: value, comment };
          setSaved(false);
          scheduleAutosave();
        }}
        className="mt-3 w-full accent-emerald"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>

      <label
        htmlFor={`comment-${submissionId}`}
        className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-muted"
      >
        Comentário
      </label>
      <textarea
        id={`comment-${submissionId}`}
        rows={3}
        maxLength={2000}
        value={comment}
        placeholder="O que pesou na nota."
        onChange={(e) => {
          const value = e.target.value;
          setComment(value);
          latestRef.current = { grade, comment: value };
          setSaved(false);
          scheduleAutosave();
        }}
        className="mt-1.5 w-full rounded-xl border border-green/25 bg-surface px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted/60 focus:border-emerald focus-visible:ring-2 focus-visible:ring-emerald/30"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          className="px-5 py-2 text-sm"
        >
          {pending ? "Salvando..." : rated ? "Atualizar nota" : "Salvar nota"}
        </Button>
        {rated && (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
          >
            Limpar
          </button>
        )}
        <span aria-live="polite" className="text-sm">
          {error && <span className="font-semibold text-red-700">{error}</span>}
          {saved && !error && <span className="text-emerald">Salvo.</span>}
        </span>
      </div>
    </div>
  );
}
