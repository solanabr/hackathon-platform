import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  not_authenticated: { status: 401, message: "Não autenticado." },
  member_not_found: { status: 404, message: "Convite não encontrado." },
  cannot_remove_leader: { status: 400, message: "Líder não pode se remover." },
  not_leader: { status: 403, message: "Apenas o líder pode remover." },
  team_locked: { status: 400, message: "Time já submetido." },
};

// The remove_team_member RPC re-runs the leader/locked checks under FOR
// UPDATE, so this route no longer hand-rolls them without the row lock.
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.memberId !== "string") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("remove_team_member", { p_member_id: body.memberId });
  if (error) {
    const mapped = RPC_ERRORS[error.message];
    return NextResponse.json(
      { error: mapped?.message ?? "Falha ao remover." },
      { status: mapped?.status ?? 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
