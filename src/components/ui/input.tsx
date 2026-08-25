import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

const BASE =
  "w-full rounded-xl border border-white/10 bg-surface-raised px-4 py-3 text-ink placeholder:text-muted focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/30 transition-colors";

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...rest },
  ref,
) {
  return <input ref={ref} className={`${BASE} ${className}`} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = "", rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${BASE} resize-y ${className}`}
      {...rest}
    />
  );
});

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}
