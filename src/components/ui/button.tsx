import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-muted transition-colors hover:text-ink",
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