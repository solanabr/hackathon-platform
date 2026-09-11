import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveRoleState } from "@/lib/roles";
import { resolveSessionClaims } from "@/lib/user-state";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { UserMenu } from "./user-menu";
import { AuthActions } from "./auth-actions";
import { LpSectionNav } from "./lp-section-nav";
import { PAGE_SHELL } from "./container";

/**
 * A hairline bar on the cream, not an object sitting on it: the page keeps the
 * whole canvas and the chrome gets out of the way.
 *
 * Only the session claims (a local JWT check) resolve before the shell goes
 * out; the profile and roles reads stream into the menu slot behind a
 * same-size placeholder. Without the boundary every page's first byte waited
 * on those two queries before the browser could even start on CSS and fonts.
 */
const ENTRAR_CLASS =
  "btn-cut btn-cut-outline btn-cut-quiet inline-flex items-center px-3.5 py-1.5 text-[13px] font-semibold text-ink sm:px-5 sm:py-2 sm:text-sm";

const CADASTRO_CLASS =
  "btn-cut inline-flex items-center whitespace-nowrap bg-emerald-deep px-3.5 py-1.5 text-[13px] font-semibold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark sm:px-5 sm:py-2 sm:text-sm";

export async function Header() {
  const claims = await resolveSessionClaims();

  return (
    <header className="chrome-assenta sticky top-0 z-50 border-b border-ink/10 bg-surface/80 backdrop-blur-md">
      {claims && <PostHogIdentify userId={claims.userId} />}
      <div className={`${PAGE_SHELL} flex h-16 items-center justify-between gap-4`}>
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
        >
          <Image
            src="/brand/stbr/logo/ST-DARK-GREEN-HORIZONTAL.svg"
            alt="Superteam Brasil"
            width={140}
            height={24}
            priority
            className="h-6 w-auto"
            style={{ height: "1.5rem", width: "auto" }}
          />
        </Link>

        <div className="hidden lg:flex lg:flex-1 lg:justify-center">
          <LpSectionNav />
        </div>

        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {claims ? (
            <Suspense
              fallback={
                <span
                  aria-hidden
                  className="block h-9 w-9 rounded-xl bg-emerald ring-2 ring-ink/10"
                />
              }
            >
              <SignedInMenu />
            </Suspense>
          ) : (
            <AuthActions
              entrarClassName={ENTRAR_CLASS}
              cadastroClassName={CADASTRO_CLASS}
            />
          )}
        </nav>
      </div>
      {/* A régua: quanto da folha já passou. Fica na base do cabeçalho porque é
          exatamente ali que a barra encosta no conteúdo — a linha marca a
          fronteira entre o chrome e a página, e de quebra informa. */}
      <span
        aria-hidden
        className="lp-regua absolute inset-x-0 bottom-[-2px] h-[2px] bg-yellow-strong"
      />
    </header>
  );
}

async function SignedInMenu() {
  const roles = await resolveRoleState();
  if (!roles)
    return (
      <AuthActions
        entrarClassName={ENTRAR_CLASS}
        cadastroClassName={CADASTRO_CLASS}
      />
    );
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
