import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveRoleState } from "@/lib/roles";
import { resolveSessionClaims } from "@/lib/user-state";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { UserMenu } from "./user-menu";
import { EntrarLink } from "./entrar-link";
import { CadastroLink } from "./cadastro-link";
import { LpSectionNav } from "./lp-section-nav";

/**
 * Floating dark dock instead of a hairline bar: the cream page keeps its
 * canvas, the chrome reads as one object sitting on top of it.
 *
 * Only the session claims (a local JWT check) resolve before the shell goes
 * out; the profile and roles reads stream into the menu slot behind a
 * same-size placeholder. Without the boundary every page's first byte waited
 * on those two queries before the browser could even start on CSS and fonts.
 */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark";
const ENTRAR_CLASS = `rounded-full bg-yellow px-5 py-2 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5 ${FOCUS_RING}`;
// Below lg the sticky MobileCtaBar carries the cadastro button; between lg and
// xl the seven section pills leave no room for it without crushing the logo.
const ENTRAR_LP_CLASS = `rounded-full border-2 border-surface/40 px-4 py-1.5 text-sm font-bold text-surface transition-colors duration-200 hover:bg-surface hover:text-green-dark sm:inline-block ${FOCUS_RING}`;
const CADASTRO_CLASS = `hidden whitespace-nowrap xl:inline-block ${ENTRAR_CLASS}`;

export async function Header() {
  const claims = await resolveSessionClaims();

  return (
    <header className="sticky top-3 z-50 px-3 sm:top-4 sm:px-6">
      {claims && <PostHogIdentify userId={claims.userId} />}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border-2 border-green-dark bg-green-dark px-4 py-3 shadow-sticker sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark"
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

        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {!claims && <CadastroLink className={CADASTRO_CLASS} />}
          {claims ? (
            <Suspense
              fallback={
                <span aria-hidden className="block h-9 w-9 rounded-xl bg-emerald ring-2 ring-surface/30" />
              }
            >
              <SignedInMenu />
            </Suspense>
          ) : (
            <EntrarLink className={ENTRAR_CLASS} lpClassName={ENTRAR_LP_CLASS} />
          )}
        </nav>
      </div>
    </header>
  );
}

async function SignedInMenu() {
  const roles = await resolveRoleState();
  if (!roles) return <EntrarLink className={ENTRAR_CLASS} lpClassName={ENTRAR_LP_CLASS} />;
  const { state } = roles;
  const admin = roles.isAdmin || roles.adminFor.length > 0;
  // /judge only admits global admins and real judges; a scoped edition admin
  // would 404 there, so their menu must not offer it.
  const judge = roles.isAdmin || roles.judgeFor.length > 0;

  const menuLinks = [
    { href: "/account", label: "Minha conta" },
    ...(judge ? [{ href: "/judge", label: "Avaliar" }] : []),
    ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <UserMenu
      name={state.profile?.full_name ?? null}
      email={state.email}
      avatarUrl={state.profile?.avatar_url ?? null}
      links={menuLinks}
    />
  );
}
