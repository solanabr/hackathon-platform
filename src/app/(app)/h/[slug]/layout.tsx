import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { EditionNav, type NavItem } from "@/components/edition/edition-nav";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { getTeamForHackathon } from "@/lib/team";
import { requireUser } from "@/lib/user-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  const registration = await getRegistration(state.userId, hackathon.id);

  // Before registration the nav would only offer routes that bounce back here.
  if (!isRegistrationComplete(registration)) return <>{children}</>;

  const [snapshot, supabase] = await Promise.all([
    getTeamForHackathon(state.userId, hackathon.id),
    createServerSupabaseClient(),
  ]);

  const { count: available } = await supabase
    .from("hackathon_contents")
    .select("id", { count: "exact", head: true })
    .eq("hackathon_id", hackathon.id);

  const base = `/h/${slug}`;
  const items: NavItem[] = [
    { href: `${base}/painel`, label: "Painel" },
    { href: `${base}/conteudos`, label: "Conteúdos", badge: available ? String(available) : null },
    { href: snapshot ? `${base}/time` : `${base}/time/novo`, label: "Time" },
    ...(snapshot ? [{ href: `${base}/submissao`, label: "Submissão" }] : []),
  ];

  return (
    <>
      <EditionNav items={items} />
      {children}
    </>
  );
}
