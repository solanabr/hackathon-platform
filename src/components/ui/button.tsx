import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "yellow" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  yellow: "btn-primary",
  secondary: "btn-secondary",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold text-muted transition-colors hover:text-ink",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 font-semibold text-red-300 transition-colors hover:bg-red-400/20",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5",
  lg: "h-12 px-6",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}) {
  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${focusRing} ${fullWidth ? "w-full" : ""} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
