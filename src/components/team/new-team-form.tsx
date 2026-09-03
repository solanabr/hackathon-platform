"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackClient } from "@/lib/analytics-browser";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";

const ERRORS: Record<string, string> = {
  already_on_team: "Você já está em um time neste hackathon.",
  not_authenticated: "Sessão expirada. Faça login novamente.",
  duplicate_name: "Já existe um time com esse nome.",
  deadline_passed: "O prazo de submissão já passou. Não dá mais para criar times nesta edição.",
  external_edition: "Esta edição não usa times na plataforma.",
};

export function NewTeamForm({
  hackathonId,
  slug,
}: {
  hackathonId: string;
  slug: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError("Nome do time é obrigatório.");
      setLoading(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("create_team_with_leader", {
      p_hackathon_id: hackathonId,
      p_name: name,
      p_description: description,
    });

    if (rpcError) {
      const msg =
        ERRORS[rpcError.message] ??
        (rpcError.message.includes("teams_hackathon_id_name_key")
          ? ERRORS.duplicate_name
          : "Não foi possível criar o time. Tente novamente.");
      setError(msg);
      setLoading(false);
      return;
    }

    trackClient("team_created", { edition: slug });

    router.push(`/h/${slug}/team`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="team_name">Nome do time</Label>
        <Input
          id="team_name"
          required
          maxLength={64}
          placeholder="Ex.: Cerrado Labs"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="team_desc" hint="opcional">Em uma frase, o que o time vai construir</Label>
        <Textarea
          id="team_desc"
          maxLength={400}
          rows={3}
          placeholder="Ex.: Marketplace de RWAs tokenizados em Solana."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" fullWidth disabled={loading} className="py-4">
        {loading ? "Criando..." : "Criar time"}
      </Button>
    </form>
  );
}
