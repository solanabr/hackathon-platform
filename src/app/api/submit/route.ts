import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const RPC_ERRORS: Record<string, { status: number; message: string }> = {
  not_authenticated: { status: 401, message: "Sessão expirada." },
  not_leader: { status: 403, message: "Apenas o líder pode submeter." },
  team_not_found: { status: 404, message: "Time não encontrado." },
  already_locked: { status: 409, message: "Time já submetido." },
  deadline_passed: { status: 409, message: "Prazo encerrado." },
  missing_required_fields: {
    status: 422,
    message: "Preencha todos os campos obrigatórios (incluindo imagem do projeto).",
  },
  team_too_small: {
    status: 422,
    message: "O time precisa de pelo menos 2 integrantes aceitos para submeter.",
  },
  members_missing_luma: {
    status: 422,
    message: "Todos os integrantes precisam confirmar a inscrição no Luma antes de submeter.",
  },
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.teamId !== "string") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { error: rpcError } = await supabase.rpc("submit_team", { p_team_id: body.teamId });
  if (rpcError) {
    const mapped = RPC_ERRORS[rpcError.message];
    return NextResponse.json(
      { error: mapped?.message ?? "Não foi possível submeter.", code: rpcError.message },
      { status: mapped?.status ?? 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
