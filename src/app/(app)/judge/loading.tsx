import Loading from "@/components/ui/loading";

// Boundary at the segment so navigation commits the fallback immediately —
// which is also when the router scrolls to top. Without it the old page
// holds at its scroll position until the new one fully renders.
export default function SegmentLoading() {
  return <Loading className="min-h-dvh" />;
}
