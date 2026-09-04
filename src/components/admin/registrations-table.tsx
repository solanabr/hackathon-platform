"use client";

import { useMemo, useState } from "react";
import { TablePager, searchInputClass } from "@/components/admin/table-controls";

export type RegistrationTableRow = {
  userId: string;
  name: string | null;
  email: string | null;
  teamName: string | null;
};

const PAGE_SIZE = 10;

export function RegistrationsTable({ rows }: { rows: RegistrationTableRow[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => (r.name ?? "").toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="mt-4">
      <input
        type="search"
        aria-label="Buscar por nome ou e-mail"
        value={search}
        placeholder="Buscar por nome ou e-mail"
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className={searchInputClass}
      />

      {filtered.length === 0 ? (
        <p className="mt-5 font-mono text-sm text-muted">Nenhuma inscrição encontrada.</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-mono text-[11px] uppercase tracking-widest text-muted">
                  <th className="py-3 pl-4 pr-4 font-semibold">Nome</th>
                  <th className="py-3 pr-4 font-semibold">E-mail</th>
                  <th className="py-3 pr-4 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.userId} className="odd:bg-surface-deep">
                    <td className="py-2.5 pl-4 pr-4 font-medium">{r.name ?? "—"}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted">{r.email ?? "—"}</td>
                    <td className="py-2.5 pr-4">{r.teamName ?? "—"}</td>
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
