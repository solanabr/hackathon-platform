import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradientBackground } from "@/components/layout/background";
import { Header } from "@/components/layout/header";
import { AcceptInviteButton } from "@/components/team/accept-invite-button";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyInviteToken } from "@/lib/tokens";
import { resolveAuthenticatedUserState } from "@/lib/user-state";

export const dynamic = "force-dynamic";

type InvitePreview = {
  teamName: string;
  inviterName: string | null;
  email: string;
};

async function loadInvite(token: string): Promise<InvitePreview | null> {
  const verified = verifyInviteToken(token);
  if (!verified) return null;
  const admin = await createServiceRoleClient();
  const { data } = await admin
    .from("team_members")
    .select("invited_email, status, teams!inner(name, leader_id, users:users!teams_leader_id_fkey(full_name))")
    .eq("invite_token", token)
    .maybeSingle();
  if (!data || data.status !== "pending") return null;
  const team = Array.isArray(data.teams) ? data.teams[0] : data.teams;
  const inviter = Array.isArray(team.users) ? team.users[0] : team.users;
  return {
    teamName: team.name,
    inviterName: inviter?.full_name ?? null,
    email: data.invited_email,
  };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await loadInvite(token);
  const state = await resolveAuthenticatedUserState();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <GradientBackground />
      <div className="relative z-10">
        <Header isAuthenticated={!!state} primaryHref={state?.redirectPath ?? "/auth"} />
        <div className="px-4 py-16 sm:px-6">
          <Card className="mx-auto max-w-lg p-8 sm:p-10">
            {!invite ? (
              <div className="text-center">
                <Badge tone="neutral">Convite inválido</Badge>
                <h1 className="mt-4 font-heading text-2xl font-bold">Esse convite não vale mais</h1>
                <p className="mt-2 text-bh-muted">
                  Pode ter expirado, sido cancelado ou já aceito. Peça um novo convite ao líder do time.
                </p>
                <div className="mt-6">
                  <Link href="/">
                    <Button variant="secondary">Voltar ao início</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Badge tone="emerald">Convite para time</Badge>
                <h1 className="mt-4 font-heading text-2xl font-bold">
                  Entrar no time <span className="gradient-text">{invite.teamName}</span>
                </h1>
                <p className="mt-3 text-bh-muted">
                  {invite.inviterName ?? "O líder"} convidou <strong className="text-bh-text">{invite.email}</strong>{" "}
                  para o Hackathon BH Onchain.
                </p>

                {state ? (
                  <div className="mt-6">
                    {state.email.toLowerCase() !== invite.email.toLowerCase() ? (
                      <>
                        <p className="mb-4 text-xs text-amber-300">
                          Você está logado como <strong>{state.email}</strong>. O convite é
                          para <strong>{invite.email}</strong>. Saia e entre com o e-mail
                          correto para aceitar.
                        </p>
                        <form action="/api/auth/signout" method="POST">
                          <Button type="submit" variant="secondary" fullWidth className="py-4">
                            Sair e entrar com outro e-mail
                          </Button>
                        </form>
                      </>
                    ) : (
                      <AcceptInviteButton token={token} />
                    )}
                  </div>
                ) : (
                  <div className="mt-6">
                    <Link href={`/auth?redirect=${encodeURIComponent(`/invite/${token}`)}`}>
                      <Button variant="primary" fullWidth className="py-4">
                        Fazer login para aceitar
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
