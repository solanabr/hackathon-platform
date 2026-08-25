import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-muted transition-colors hover:text-ink",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 px-6 py-3 font-semibold text-red-300 transition-colors hover:bg-red-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
};

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; fullWidth?: boolean }) {
  return (
    <button
      className={`${variants[variant]} ${fullWidth ? "w-full" : ""} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}