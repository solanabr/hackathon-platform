"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  prompt?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  title?: string;
  className?: string;
  onConfirm: () => void;
};

/**
 * Inline replacement for native confirm(): the action button first, and on
 * click it swaps for "Tem certeza? [Confirmar] [Cancelar]" in place. Safari
 * on iOS at the venue doesn't render confirm() dialogs well, so the decision
 * must live in the page.
 */
export function ConfirmButton({
  label,
  prompt = "Tem certeza?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  disabled = false,
  title,
  className = "",
  onConfirm,
}: Props) {
  const [asking, setAsking] = useState(false);

  if (asking) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">{prompt}</span>
        <Button
          type="button"
          variant={variant}
          className={className}
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="px-4 py-2 text-sm"
          onClick={() => setAsking(false)}
        >
          {cancelLabel}
        </Button>
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled}
      title={title}
      className={className}
      onClick={() => setAsking(true)}
    >
      {label}
    </Button>
  );
}
