import Image from "next/image";
import { isAllowedImageHost } from "@/lib/image-hosts";

const SIZES = {
  sm: { px: 36, box: "h-9 w-9 rounded-xl", text: "text-xs" },
  md: { px: 48, box: "h-12 w-12 rounded-xl", text: "text-base" },
  lg: { px: 96, box: "h-24 w-24 rounded-2xl", text: "text-3xl" },
} as const;

export function Avatar({
  src,
  name,
  size = "sm",
  className = "",
  ring = "ring-emerald/20",
}: {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: string;
}) {
  const { px, box, text } = SIZES[size];
  const shared = `${box} shrink-0 object-cover ring-2 ${ring} ${className}`;

  if (isAllowedImageHost(src)) {
    return (
      <Image
        src={src}
        alt=""
        width={px}
        height={px}
        className={`${shared} border border-green/15`}
      />
    );
  }

  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={`${shared} flex items-center justify-center bg-emerald font-bold text-surface ${text}`}
    >
      {initial}
    </span>
  );
}
