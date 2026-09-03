"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackClient } from "@/lib/analytics-browser";
import { sanitizeRedirect } from "@/lib/security";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Provider = "google" | "github";

const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Google",
  github: "GitHub",
};

const CALLBACK_ERRORS: Record<string, string> = {
  link_invalid: "O link de acesso expirou ou já foi usado. Peça um novo código abaixo.",
  provider_error: "O provedor de login recusou o acesso. Tente de novo ou use o código por e-mail.",
  auth_failed:
    "Não foi possível concluir o login. Abra o link no mesmo navegador em que pediu o código, ou peça um novo.",
};

export function AuthForm({ defaultNext }: { defaultNext?: string } = {}) {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(
    callbackError ? (CALLBACK_ERRORS[callbackError] ?? CALLBACK_ERRORS.auth_failed) : null,
  );
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const supabase = createClient();

  useEffect(() => {
    if (callbackError) {
      trackClient("auth_failed", { provider: "unknown", reason: callbackError });
    }
    // Only relevant to the redirect that produced this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // `next` carries the page the user came from (requireUser/middleware);
  // `redirect` is kept as a legacy alias for invite links that still use it.
  const postLoginPath =
    sanitizeRedirect(searchParams.get("next")) ??
    sanitizeRedirect(searchParams.get("redirect")) ??
    sanitizeRedirect(defaultNext ?? null);

  async function signIn(provider: Provider) {
    trackClient("auth_provider_clicked", { provider });
    setLoading(provider);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback${
      postLoginPath ? `?next=${encodeURIComponent(postLoginPath)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError(`Não foi possível conectar com ${PROVIDER_LABELS[provider]}. Tente novamente.`);
      setLoading(null);
      trackClient("auth_failed", { provider, reason: "oauth_request_failed" });
    }
  }

  function redirectTarget() {
    return `${window.location.origin}/auth/callback${
      postLoginPath ? `?next=${encodeURIComponent(postLoginPath)}` : ""
    }`;
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStage("sending");
    trackClient("auth_provider_clicked", { provider: "email" });
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTarget() },
    });
    if (error) {
      setError("Não foi possível enviar o código. Confira o e-mail e tente de novo.");
      setStage("idle");
      trackClient("auth_failed", { provider: "email", reason: "otp_request_failed" });
      return;
    }
    setStage("sent");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStage("verifying");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setError("Código inválido ou expirado. Peça um novo.");
      setStage("sent");
      trackClient("auth_failed", { provider: "email", reason: "otp_verify_failed" });
      return;
    }
    trackClient("auth_code_verified");
    // Route back through /auth/callback when no deep link was requested, so a
    // signed-in participant lands on their painel instead of the home gallery.
    window.location.assign(postLoginPath ?? "/auth/callback");
  }

  return (
    <div className="w-full max-w-md rounded-3xl border-2 border-green-dark bg-surface-raised p-8 shadow-[10px_10px_0_rgba(27,35,29,0.9)] sm:p-10">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
          alt="Superteam Brasil"
          className="mx-auto h-14 w-14 -rotate-3 object-contain"
        />
        <h1 className="mt-5 font-heading font-black uppercase leading-tight tracking-tight">
          <span className="block text-2xl [font-stretch:118%] sm:text-3xl">Acessar a</span>
          <span className="mt-1.5 inline-block -rotate-1 bg-green-dark px-3 py-1 text-xl text-yellow [font-stretch:110%] sm:text-2xl">
            Plataforma
          </span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Entre para participar dos hackathons da Superteam Brasil.
        </p>
      </div>

      {error && (
        <p className="mt-6 rounded-xl border-2 border-red-700/25 bg-red-600/10 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <div className="mt-7 space-y-3">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={loading !== null}
          onClick={() => signIn("google")}
          className="gap-3 py-4"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading === "google" ? "Conectando..." : "Entrar com Google"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={loading !== null}
          onClick={() => signIn("github")}
          className="gap-3 py-4"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.07 3.29 9.37 7.86 10.89.58.1.79-.25.79-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.9-.39.99 0 1.98.13 2.9.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.4-5.25 5.68.41.36.77 1.06.77 2.13v3.16c0 .31.21.66.79.55C20.21 21.37 23.5 17.07 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
          </svg>
          {loading === "github" ? "Conectando..." : "Entrar com GitHub"}
        </Button>
      </div>

      <div className="mt-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-green/15" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">ou</span>
        <span className="h-px flex-1 bg-green/15" />
      </div>

      {stage === "sent" || stage === "verifying" ? (
        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="code">Código enviado para {email}</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              spellCheck={false}
              required
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button type="submit" fullWidth disabled={stage === "verifying"}>
            {stage === "verifying" ? "Verificando..." : "Entrar"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStage("idle");
              setCode("");
            }}
            className="w-full text-center text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Usar outro e-mail
          </button>
        </form>
      ) : (
        <form onSubmit={sendCode} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              required
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" fullWidth disabled={stage === "sending" || loading !== null}>
            {stage === "sending" ? "Enviando..." : "Enviar código"}
          </Button>
        </form>
      )}

      <p className="mt-7 text-center text-xs text-muted">
        Ao entrar você concorda com o regulamento dos hackathons da Superteam Brasil.
      </p>
    </div>
  );
}
