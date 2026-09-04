import Loading from "@/components/ui/loading";

// The form is short, so the segment fallback's full-viewport height would
// drop the footer by half a screen once the page streams in. This matches
// the layout's minimum content height, which is about what the form takes.
export default function RegisterLoading() {
  return <Loading className="min-h-[calc(100dvh-24rem)]" />;
}
