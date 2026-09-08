import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { defaultAuthRedirect, resolveAuthenticatedUserState } from "@/lib/user-state";
import { pickAuthNext } from "@/lib/auth-next";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect?: string }>;
}) {
  const { next, redirect: redirectParam } = await searchParams;
  const state = await resolveAuthenticatedUserState();
  if (state) {
    // Keep the deep link: someone mid-registration who is already signed in
    // continues where they were, not on their painel.
    redirect(pickAuthNext(next, redirectParam) ?? (await defaultAuthRedirect(state)));
  }

  const interestFunnel = pickAuthNext(next, redirectParam)?.startsWith("/pre-registro") ?? false;

  return (
    <main className="relative bg-surface">
      <div className="relative z-10 flex justify-center px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-10">
        <Suspense fallback={null}>
          <AuthForm
            intro={
              interestFunnel
                ? "Para se cadastrar no hackathon, entre com Google ou receba um código por e-mail. Leva 1 minuto."
                : undefined
            }
          />
        </Suspense>
      </div>
    </main>
  );
}
