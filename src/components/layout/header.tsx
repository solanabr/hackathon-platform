import Link from "next/link";
import Image from "next/image";
import { resolveRoleState } from "@/lib/roles";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { UserMenu } from "./user-menu";
import { EntrarLink } from "./entrar-link";
import { LpSectionNav } from "./lp-section-nav";

/**
 * Floating dark dock instead of a hairline bar: the cream page keeps its
 * canvas, the chrome reads as one object sitting on top of it.
 */
export async function Header() {
  const roles = await resolveRoleState();
  const state = roles?.state ?? null;
  const admin = (roles?.isAdmin ?? false) || (roles?.adminFor.length ?? 0) > 0;
  // /judge only admits global admins and real judges; a scoped edition admin
  // would 404 there, so their menu must not offer it.
  const judge = (roles?.isAdmin ?? false) || (roles?.judgeFor.length ?? 0) > 0;

  const menuLinks = state
    ? [
        { href: "/account", label: "Minha conta" },
        ...(judge ? [{ href: "/judge", label: "Avaliar" }] : []),
        ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <header className="sticky top-3 z-50 px-3 sm:top-4 sm:px-6">
      {state && <PostHogIdentify userId={state.userId} />}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border-2 border-green-dark bg-green-dark px-4 py-3 shadow-sticker sm:px-6">
        <Link
          href={state ? "/h" : "/"}
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark"
        >
          <Image
            src="/brand/stbr/logo/horizontal-fwhite.svg"
            alt="Superteam Brasil"
            width={140}
            height={24}
            priority
            className="h-6 w-auto"
          />
        </Link>

        <div className="hidden lg:flex lg:flex-1 lg:justify-center">
          <LpSectionNav />
        </div>

        <nav className="flex items-center gap-1 text-sm sm:gap-1.5">
          {state ? (
            <UserMenu
              name={state.profile?.full_name ?? null}
              email={state.email}
              avatarUrl={state.profile?.avatar_url ?? null}
              links={menuLinks}
            />
          ) : (
            <EntrarLink className="rounded-full bg-yellow px-5 py-2 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark" />
          )}
        </nav>
      </div>
    </header>
  );
}
