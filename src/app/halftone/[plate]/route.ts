import { PLATE_FILES, plateByFilename } from "@/components/home/plates";

/* The LP's halftone plates, as files. The name carries the content hash, so
   the cache can be eternal: a redrawn plate is born with another URL.
   Prerendered at build; in dev, generated on first request. */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return PLATE_FILES.map((plate) => ({ plate }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ plate: string }> },
) {
  const { plate } = await params;
  const svg = plateByFilename(plate);
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
