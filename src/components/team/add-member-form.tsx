"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMemberByEmail } from "@/app/(app)/h/[slug]/team/actions";

type Message =
  | { type: "ok-account"; email: string; emailSent: boolean }
  | { type: "ok-noaccount"; email: string; emailSent: boolean }
  | { type: "error"; text: string };

export function AddMemberForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await addMemberByEmail({ teamId, email });
      if (!res.ok) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setMessage({
        type: res.hasAccount ? "ok-account" : "ok-noaccount",
        email: res.email,
        emailSent: res.emailSent,
      });
      setEmail("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          required
          placeholder="email@dotime.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={pending || !email}>
          {pending ? "Adicionando..." : "Adicionar"}
        </Button>
      </div>
      {(message?.type === "ok-account" || message?.type === "ok-noaccount") && (
        <div className="rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3 text-sm">
          <p className="text-ink">
            <strong>{message.email}</strong>{" "}
            {message.type === "ok-account"
              ? "foi adicionado ao time."
              : "ainda não tem conta. Vai aparecer no time assim que essa pessoa entrar com este e-mail."}
          </p>
          <p className="mt-1 text-muted">
            {message.emailSent
              ? "Enviamos um e-mail avisando."
              : "Não conseguimos enviar o e-mail de aviso, então avise a pessoa por outro canal."}
          </p>
        </div>
      )}
      {message?.type === "error" && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
          {message.text}
        </p>
      )}
    </form>
  );
}
