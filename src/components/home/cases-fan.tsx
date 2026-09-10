import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";

export type CaseCard = {
  name: string;
  url?: string;
  logo?: string;
  figure: string;
  result: string;
  tagline: string;
  body: ReactNode;
  tone?: "light" | "dark";
};

/* Adesivo colado no meio da frase: tamanho, ângulo e recuo entram por prop
   porque cada um foi posicionado à mão contra as letras vizinhas. Um valor
   único para os três devolveria a fileira certinha que a marca não é. */
export function HeadTile({
  src,
  label,
  tilt = "-rotate-3",
  size = "0.72em",
  nudge = "",
}: {
  src?: string;
  label?: string;
  tilt?: string;
  size?: string;
  nudge?: string;
}) {
  const base = `inline-block shrink-0 rounded-2xl border-2 border-green-dark shadow-sticker ${tilt} ${nudge}`;
  const box = { height: size, width: size };

  if (!src) {
    return (
      <span
        aria-hidden
        style={box}
        className={`${base} inline-flex items-center justify-center bg-yellow font-heading leading-none text-green-dark`}
      >
        <span className="translate-y-[-0.02em] text-[0.62em]">
          {label ?? "?"}
        </span>
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={160}
      height={160}
      style={box}
      className={`${base} object-cover`}
    />
  );
}

/* O leque é dois transforms empilhados, não um: a entrada carimbada mora no
   Reveal e a pose de repouso (mais o endireitar do hover) mora na carta.
   Um transform só, e a carta entraria já torta ou perderia a rotação. */
const FAN_SLOT = ["lg:z-10 lg:-mr-5", "lg:z-20 lg:-mr-5", "lg:z-30"];

/* A pose sobe da esquerda para a direita e o ângulo gira com ela: é o que faz
   as três lerem como um leque aberto na mão, e não como um zigue-zague. */
const FAN_POSE = [
  "lg:translate-y-10 lg:-rotate-[4deg]",
  "lg:translate-y-1 lg:rotate-[1.5deg]",
  "lg:-translate-y-4 lg:rotate-[3.5deg]",
];

function CaseTile({ item }: { item: CaseCard }) {
  const dark = item.tone === "dark";
  const inner = (
    <>
      <p
        className={`font-heading text-[clamp(2.75rem,7vw,4rem)] font-black uppercase leading-[0.85] tracking-tight [font-stretch:118%] ${
          dark ? "text-yellow" : "text-green-dark"
        }`}
      >
        {item.figure}
      </p>
      <p
        className={`mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] ${
          dark ? "text-surface/75" : "text-ink/70"
        }`}
      >
        {item.result}
      </p>
      <p
        className={`mb-8 mt-5 flex-1 text-pretty leading-relaxed ${
          dark ? "text-surface/85" : "text-ink/75"
        }`}
      >
        {item.body}
      </p>
      <div
        className={`flex items-center gap-3 border-t-2 pt-5 ${
          dark ? "border-surface/20" : "border-green-dark/10"
        }`}
      >
        {item.logo ? (
          <Image
            src={item.logo}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl border-2 border-green-dark/10 object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-yellow font-heading text-xl font-black text-yellow"
          >
            ?
          </span>
        )}
        <div className="min-w-0">
          <p
            className={`font-heading text-lg font-bold ${
              item.url ? "group-hover:underline" : ""
            }`}
          >
            {item.name}
          </p>
          <p
            className={`text-sm leading-snug ${
              dark ? "text-surface/65" : "text-muted"
            }`}
          >
            {item.tagline}
          </p>
        </div>
      </div>
    </>
  );

  const shell = `card-cut group flex h-full flex-col p-7 sm:p-8 ${
    dark ? "card-cut-dark" : ""
  }`;

  return item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={shell}
    >
      {inner}
    </a>
  ) : (
    <div className={shell}>{inner}</div>
  );
}

export function CasesFan({
  cases,
  children,
}: {
  cases: CaseCard[];
  children: ReactNode;
}) {
  return (
    <div>
      {children}

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:mt-16 lg:flex lg:items-stretch lg:gap-0">
        {cases.map((item, i) => (
          <Reveal
            key={item.name}
            index={i + 1}
            tone="papel"
            className={`relative ${i === 2 ? "sm:col-span-2 lg:col-auto" : ""} lg:min-w-0 lg:flex-1 ${FAN_SLOT[i] ?? ""}`}
          >
            <div
              className={`h-full transition-transform duration-(--dur-rapida) ease-mola lg:hover:translate-y-0 lg:hover:rotate-0 ${
                FAN_POSE[i] ?? ""
              }`}
            >
              <CaseTile item={item} />
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
