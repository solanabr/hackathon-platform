import Loading from "@/components/ui/loading";

// Boundary at the segment that changes on tab switches — without it the
// router holds the old page and the click feels dead. Full fold height: a
// shorter fallback leaves the footer inside the viewport, and it jumps
// down when the page streams in — a layout shift on every load.
export default function EditionSectionLoading() {
  return <Loading className="min-h-dvh" />;
}
