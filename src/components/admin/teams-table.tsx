"use client";

import { useMemo, useState } from "react";
import { FilterPills, TablePager, searchInputClass } from "@/components/admin/table-controls";

export type TeamTableRow = {
  id: string;
  name: string;
  acceptedMembers: number;
  status: string | null;
  submittedAtLabel: string | null;
};

const PAGE_SIZE = 10;

type StatusFilter = "todos" | "submetidos" | "rascunho";

function TeamStatusChip({ status }: { status: string | null }) {
  const submitted = status === "submitted";
  const label = submitted ? "Submetido" : status === "draft" ? "Rascunho" : "Sem submissão";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${
        submitted
          ? "border-emerald/30 bg-emerald/10 text-emerald"
          : "border-green-dark/20 text-muted"
      }`}
    >
      {label}
    </span>
  );
}

export function TeamsTable({ rows }: { rows: TeamTableRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const submitted = r.status === "submitted";
      if (status === "submetidos" && !submitted) return false;
      if (status === "rascunho" && submitted) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q);
    });
  }, [rows, search, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          placeholder="Buscar por nome do time"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={searchInputClass}
        />
        <FilterPills
          label="Status"
          value={status}
          options={[
            { value: "todos", label: "Todos" },
            { value: "submetidos", label: "Submetidos" },
            { value: "rascunho", label: "Rascunho" },
          ]}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-5 font-mono text-sm text-muted">Nenhum time com esses filtros.</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  <th className="py-3 pl-4 pr-4 font-semibold">Time</th>
                  <th className="py-3 pr-4 font-semibold">Membros aceitos</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Submetido em</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="odd:bg-surface-deep">
                    <td className="py-2.5 pl-4 pr-4 font-medium">{t.name}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-muted">
                      {t.acceptedMembers}
                    </td>
                    <td className="py-2.5 pr-4">
                      <TeamStatusChip status={t.status} />
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs tabular-nums text-muted">
                      {t.submittedAtLabel ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePager page={current} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </div>
  );
}
