import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const state = await requireUser();

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-3xl font-bold">Minha conta</h1>
        <p className="mt-2 text-muted">
          Esses dados valem para todos os hackathons da Superteam Brasil.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <ProfileForm profile={state.profile} next={next} />
        </Card>
      </div>
    </div>
  );
}