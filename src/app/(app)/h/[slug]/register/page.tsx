import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BackLink } from "@/components/ui/back-link";
import { RegistrationForm } from "@/components/registration/registration-form";
import { getHackathonBySlug } from "@/lib/hackathon";
import { getRegistration, isProfileComplete, isRegistrationComplete } from "@/lib/registration";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await requireUser();
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();

  if (!isProfileComplete(state.profile)) redirect(`/account?next=/h/${slug}/register`);

  const registration = await getRegistration(state.userId, hackathon.id);
  if (isRegistrationComplete(registration)) redirect(`/h/${slug}/dashboard`);

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <BackLink href={`/h/${slug}`} label="Voltar" />
        <p className="mt-8 text-[12px] font-bold uppercase tracking-wider text-emerald">INSCRIÇÃO</p>
        <h1 className="mt-1 font-heading text-3xl font-bold">{hackathon.name}</h1>
        <p className="mt-2 text-muted">
          Falta pouco. Confirme os dois itens abaixo para liberar as aulas e a criação de time.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <RegistrationForm
            hackathonId={hackathon.id}
            slug={slug}
            lumaUrl={hackathon.luma_url}
          />
        </Card>
      </div>
    </div>
  );
}