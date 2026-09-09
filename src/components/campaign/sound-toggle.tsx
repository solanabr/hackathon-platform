"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { armAudio, play, releaseAudio } from "@/lib/sfx";

const KEY = "stbr-sfx";

/* A preferência mora fora do React, num store minúsculo.
 *
 * Lê-la num efeito e chamar setState em seguida custa um render em cascata —
 * é o que o `react-hooks/set-state-in-effect` reclama, com razão. E iniciar o
 * estado direto do localStorage quebraria a hidratação, porque o servidor não
 * tem como saber a preferência. useSyncExternalStore resolve os dois: o
 * snapshot do servidor é sempre "desligado" e o cliente assume em seguida,
 * sem render extra e sem descasamento. */
let listeners: Array<() => void> = [];
let cached: boolean | null = null;

function read() {
  if (cached === null) {
    try {
      cached = localStorage.getItem(KEY) === "1";
    } catch {
      cached = false;
    }
  }
  return cached;
}

function write(next: boolean) {
  cached = next;
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* modo privado: a preferência não sobrevive, o som funciona igual */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

/** Se o som está ligado nesta sessão. */
export function useSoundOn() {
  return useSyncExternalStore(subscribe, read, () => false);
}

/**
 * Toca um beat. Não faz nada com o som desligado, e nada mesmo enquanto
 * ninguém tiver feito um gesto: `play` sai cedo se o contexto não existir ou
 * estiver suspenso.
 */
export function useSfx() {
  const on = useSoundOn();
  return useCallback(
    (v: "carimbo" | "papel" | "picote") => {
      if (!on) return;
      play(v);
    },
    [on],
  );
}

/**
 * O controle. Chip de papel no canto oposto ao canhoto, sempre presente e
 * sempre no mesmo lugar — som que aparece sem aviso e não tem como desligar é
 * o motivo de a maioria dos sites com áudio ser insuportável.
 *
 * Também é aqui que mora a arma tardia: preferência ligada de uma visita
 * anterior deixava o botão aceso e a página muda, porque o contexto de áudio
 * só nascia no clique do próprio toggle. Agora ele nasce no primeiro gesto
 * que a pessoa fizer, seja qual for — que é o que a política de autoplay
 * exige, e nada além disso.
 */
export function SoundToggle() {
  const on = useSoundOn();
  const armed = useRef(false);

  useEffect(() => {
    if (!on || armed.current) return;
    const arm = () => {
      armed.current = true;
      armAudio();
    };
    const opts = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", arm, opts);
    window.addEventListener("keydown", arm, opts);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [on]);

  const toggle = useCallback(() => {
    const next = !read();
    write(next);
    if (next) {
      // Armar dentro do handler do clique é obrigatório: fora dele o contexto
      // nasce suspenso e o primeiro beat sai mudo.
      armed.current = true;
      armAudio();
      play("picote");
    } else {
      releaseAudio();
    }
  }, []);

  const Icon = on ? SpeakerHighIcon : SpeakerSlashIcon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Desligar o som da página" : "Ligar o som da página"}
      className={`sfx-toggle fixed bottom-3 left-3 z-40 flex size-11 items-center justify-center rounded-full border-2 border-green-dark transition-colors duration-(--dur-instant) ease-entrada sm:bottom-5 sm:left-5 ${
        on
          ? "bg-green-dark text-yellow"
          : "bg-surface-raised text-green-dark hover:bg-surface-deeper"
      }`}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Icon aria-hidden size={18} weight="bold" />
    </button>
  );
}
