import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { toCsv, type CsvCell } from "@/lib/csv";
import { formatBrt } from "@/lib/dates";
import type { Perk } from "@/types/db";

export const dynamic = "force-dynamic";

const PERKS: readonly Perk[] = ["helius"];
// PostgREST caps every response at 1,000 rows whatever range is asked for.
const PAGE = 1000;

type Row = {
  project_name: string;
  project_summary: string;
  usage_plan: string;
  created_at: string;
  updated_at: string;
  user: { full_name: string | null; email: string; whatsapp: string | null } | null;
};

const HEADER = ["nome", "email", "whatsapp", "projeto", "resumo", "uso_da_helius", "enviado_em", "atualizado_em"];

export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: "Sem permissão." }, { status: gate.reason === "unauthenticated" ? 401 : 403 });
  }
  const perk = request.nextUrl.searchParams.get("perk");
  if (!PERKS.includes(perk as Perk)) {
    return NextResponse.json({ error: "Perk inválido." }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const result = await supabase
      .from("perk_applications")
      .select("project_name, project_summary, usage_plan, created_at, updated_at, user:users(full_name, email, whatsapp)")
      .eq("perk", perk as Perk)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    const page = (unwrap(result, "admin.perks.export") as unknown as Row[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  const cells: CsvCell[][] = rows.map((r) => [
    r.user?.full_name,
    r.user?.email,
    r.user?.whatsapp,
    r.project_name,
    r.project_summary,
    r.usage_plan,
    formatBrt(r.created_at),
    formatBrt(r.updated_at),
  ]);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(HEADER, cells), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="perk-${perk}-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
