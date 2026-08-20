import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateProfile } from "./actions";
import { requireUser } from "@/lib/user-state";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const state = await requireUser();

  async function save(formData: FormData) {
    "use server";
    const result = await updateProfile(formData);
    if (!result.error && next?.startsWith("/")) redirect(next);
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-3xl font-bold">Minha conta</h1>
        <p className="mt-2 text-muted">
          Esses dados valem para todos os hackathons da Superteam Brasil.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <form action={save} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                defaultValue={state.profile?.full_name ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="github_url">GitHub</Label>
              <Input
                id="github_url"
                name="github_url"
                defaultValue={state.profile?.github_url ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="twitter_url">X / Twitter</Label>
              <Input
                id="twitter_url"
                name="twitter_url"
                defaultValue={state.profile?.twitter_url ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                defaultValue={state.profile?.linkedin_url ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="telegram_handle">Telegram</Label>
              <Input
                id="telegram_handle"
                name="telegram_handle"
                defaultValue={state.profile?.telegram_handle ?? ""}
              />
            </div>
            <Button type="submit">Salvar</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}