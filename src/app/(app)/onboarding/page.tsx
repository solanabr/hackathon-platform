import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const state = await requireUser();
  if (state.profile?.full_name && state.profile?.luma_registered_at) {
    redirect("/dashboard");
  }
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <Badge tone="emerald">Passo 1 de 3</Badge>
          <h1 className="mt-4 font-heading text-3xl font-bold sm:text-4xl">
            Vamos preparar seu perfil
          </h1>
          <p className="mt-3 text-bh-muted">
            Esses dados ficam visíveis para o seu time e para os jurados da SuperteamBR.
          </p>
        </div>

        <Card className="mt-10 p-6 sm:p-8">
          <OnboardingForm
            email={state.email}
            initial={state.profile}
          />
        </Card>
      </div>
    </div>
  );
}
