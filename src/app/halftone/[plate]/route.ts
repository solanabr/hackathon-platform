import { PLATE_FILES, plateByFilename } from "@/components/home/plates";

/* As chapas de meio-tom da LP, como arquivo. O nome carrega o hash do
   conteúdo, então o cache pode ser eterno: uma chapa redesenhada nasce com
   outra URL. Pré-renderizada no build; em dev, gerada no primeiro pedido. */
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
