"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { armAudio, play, releaseAudio } from "@/lib/sfx";

const KEY = "stbr-sfx";

/* The preference lives outside React, in a tiny store.
 *
 * Reading it in an effect and calling setState right after costs a cascading
 * render — which is what `react-hooks/set-state-in-effect` complains about,
 * rightly. And seeding state straight from localStorage would break hydration,
 * because the server has no way to know the preference. useSyncExternalStore
 * solves both: the server snapshot is always "off" and the client takes over
 * right after, with no extra render and no mismatch. */
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
    /* private mode: the preference does not survive, sound works the same */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

/** Whether sound is on in this session. */
export function useSoundOn() {
  return useSyncExternalStore(subscribe, read, () => false);
}

/**
 * Plays a beat. Does nothing with sound off, and nothing at all until someone
 * has made a gesture: `play` bails early if the context does not exist or is
 * suspended.
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
 * The control. A paper chip in the corner opposite the stub, always present
 * and always in the same place — sound that starts unannounced and cannot be
 * turned off is why most sites with audio are unbearable.
 *
 * The late arming also lives here: a preference left on from an earlier visit
 * kept the button lit and the page silent, because the audio context was only
 * born on a click of the toggle itself. Now it is born on the first gesture
 * the person makes, whatever it is — which is what the autoplay policy
 * requires, and nothing beyond that.
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
      // Arming inside the click handler is mandatory: outside it the context
      // is born suspended and the first beat comes out silent.
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
